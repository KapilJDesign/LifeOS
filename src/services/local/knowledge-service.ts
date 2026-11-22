import { findRelatedItems } from "../../lib/graph/related";
import { linkNewCapture } from "../../lib/graph/graph-builder";
import { reconcileConceptItemIds } from "../../lib/graph/concepts";
import { applyFilters, searchItems } from "../../lib/search/search";
import type { KnowledgeConcept, KnowledgeItem, TopicCollection } from "../../types/knowledge";
import type { IdGenerator } from "../../lib/ids";
import type {
  CollectionSummary,
  ConceptDetail,
  ItemDetail,
  ItemPatch,
  ItemQuery,
  KnowledgeService,
} from "../types";
import type { LocalStore } from "./local-store";

export interface LocalEnv {
  store: LocalStore;
  now: () => Date;
  ids: IdGenerator;
}

function topicsForConcepts(topics: Iterable<TopicCollection>, conceptIds: readonly string[]): TopicCollection[] {
  return [...topics].filter((topic) => topic.conceptIds.some((id) => conceptIds.includes(id)));
}

/** Persists the concept → items inverse index after items changed, writing only the concepts that differ. */
export async function syncConceptIndex(env: LocalEnv): Promise<void> {
  const { store } = env;
  const reconciled = reconcileConceptItemIds([...store.concepts.values()], [...store.items.values()]);
  const changed = reconciled.filter((concept) => {
    const before = store.concepts.get(concept.id);
    return !before || before.itemIds.length !== concept.itemIds.length || before.itemIds.some((id, i) => id !== concept.itemIds[i]);
  });
  await store.saveConcepts(changed);
}

export class LocalKnowledgeService implements KnowledgeService {
  constructor(private readonly env: LocalEnv) {}

  async listItems(query: ItemQuery = {}): Promise<KnowledgeItem[]> {
    const { store } = this.env;
    const results = searchItems([...store.items.values()], [...store.concepts.values()], "", {
      filters: query.filters,
      sort: query.sort,
      limit: query.limit,
      topics: [...store.topics.values()],
    });
    return results.map((result) => result.item);
  }

  async getItem(id: string): Promise<KnowledgeItem | undefined> {
    return this.env.store.items.get(id);
  }

  async getItemDetail(id: string): Promise<ItemDetail | undefined> {
    const { store } = this.env;
    const item = store.items.get(id);
    if (!item) return undefined;
    const state = store.state();
    const concepts = item.concepts.map((conceptId) => store.concepts.get(conceptId)).filter((c): c is KnowledgeConcept => Boolean(c));
    return {
      item,
      concepts,
      relatedItems: findRelatedItems(item, state.items, state.concepts, state.relationships),
      topics: topicsForConcepts(store.topics.values(), item.concepts),
      reminders: [...store.reminders.values()].filter((reminder) => reminder.sourceItemId === id),
    };
  }

  async updateItem(id: string, patch: ItemPatch): Promise<KnowledgeItem> {
    const { store, now, ids } = this.env;
    const current = store.items.get(id);
    if (!current) throw new Error(`Item not found: ${id}`);

    const { conceptNames, ...fields } = patch;
    const defined = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as Partial<KnowledgeItem>;
    let next: KnowledgeItem = { ...current, ...defined, updatedAt: now().toISOString() };
    if (fields.title !== undefined) next.title = fields.title.trim() || current.title;

    if (conceptNames) {
      const link = linkNewCapture(store.state(), next, conceptNames, [], { idGenerator: ids });
      next = link.item;
      await store.saveItem(next);
      await store.saveConcepts(link.concepts);
      await store.saveRelationships(link.relationships);
      await store.saveTopics(link.topics);
      await syncConceptIndex(this.env);
      return next;
    }
    await store.saveItem(next);
    return next;
  }

  async toggleFavorite(id: string): Promise<KnowledgeItem> {
    const current = this.env.store.items.get(id);
    if (!current) throw new Error(`Item not found: ${id}`);
    return this.updateItem(id, { isFavorite: !current.isFavorite });
  }

  async deleteItem(id: string): Promise<void> {
    await this.env.store.removeItem(id);
  }

  async listConcepts(): Promise<KnowledgeConcept[]> {
    return [...this.env.store.concepts.values()].sort((a, b) => b.itemIds.length - a.itemIds.length || a.name.localeCompare(b.name));
  }

  async getConceptDetail(id: string): Promise<ConceptDetail | undefined> {
    const { store } = this.env;
    const concept = store.concepts.get(id);
    if (!concept) return undefined;
    const related: ConceptDetail["relatedConcepts"] = [];
    for (const rel of store.relationships.values()) {
      if (rel.sourceKind !== "concept" || rel.targetKind !== "concept") continue;
      const otherId = rel.sourceId === id ? rel.targetId : rel.targetId === id ? rel.sourceId : undefined;
      const other = otherId ? store.concepts.get(otherId) : undefined;
      if (other && !related.some((entry) => entry.concept.id === other.id)) {
        related.push({ concept: other, relationship: rel.relationship });
      }
    }
    return {
      concept,
      items: concept.itemIds.map((itemId) => store.items.get(itemId)).filter((i): i is KnowledgeItem => Boolean(i)),
      relatedConcepts: related,
      topics: topicsForConcepts(store.topics.values(), [id]),
    };
  }

  private summarize(topic: TopicCollection): CollectionSummary {
    const { store } = this.env;
    const items = applyFilters([...store.items.values()], { topicId: topic.id, status: ["ready"] }, [topic]).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    return {
      topic,
      itemCount: items.length,
      concepts: topic.conceptIds.map((id) => store.concepts.get(id)).filter((c): c is KnowledgeConcept => Boolean(c)),
      recentItems: items.slice(0, 4),
    };
  }

  async listCollections(): Promise<CollectionSummary[]> {
    return [...this.env.store.topics.values()].map((topic) => this.summarize(topic)).sort((a, b) => b.itemCount - a.itemCount);
  }

  async getCollection(id: string): Promise<CollectionSummary | undefined> {
    const topic = this.env.store.topics.get(id);
    return topic ? this.summarize(topic) : undefined;
  }

  subscribe(listener: Parameters<KnowledgeService["subscribe"]>[0]) {
    return this.env.store.subscribe(listener);
  }
}
