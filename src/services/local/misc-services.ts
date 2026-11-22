import { askKnowledge } from "../../lib/chat/answer";
import type { AnswerComposer } from "../../lib/ai/llm-provider";
import {
  buildExploreDeck,
  computeProgress,
  createHistoryEntry,
  localDateKey,
  recentHistory,
  recordView,
  selectDailyDiscovery,
  type DeckMode,
} from "../../lib/discovery";
import { buildGraph, getNeighborhood, type GraphData, type GraphOptions } from "../../lib/graph/graph-builder";
import { createReminder, suggestReminders, type ReminderSuggestion } from "../../lib/reminders";
import { searchItems, suggestQueries, type SearchResult } from "../../lib/search/search";
import { resetToDemo } from "../../lib/storage/seed";
import { DATA_VERSION } from "../../lib/storage/migrations";
import { buildSharePayload, canShareNatively, shareContent, type ShareEnv, type ShareResult, type SharePayload, type ShareTarget } from "../../lib/share/share";
import type {
  ChatAnswer,
  DailyDiscovery,
  ExploreProgress,
  HistoryEntry,
  KnowledgeConcept,
  KnowledgeItem,
  Reminder,
  ReviewState,
  ViewSurface,
} from "../../types/knowledge";
import type {
  ChatService,
  DataService,
  DiscoveryService,
  ExportBundle,
  GraphService,
  ReminderInput,
  ReminderService,
  SearchService,
  ShareRequest,
  ShareService,
} from "../types";
import type { LocalEnv } from "./knowledge-service";

export class LocalSearchService implements SearchService {
  constructor(private readonly env: LocalEnv) {}

  async search(query: string, options: Parameters<SearchService["search"]>[1] = {}): Promise<SearchResult[]> {
    const { store } = this.env;
    return searchItems([...store.items.values()], [...store.concepts.values()], query, {
      ...options,
      topics: [...store.topics.values()],
    });
  }

  async suggest(prefix: string, limit?: number): Promise<string[]> {
    const { store } = this.env;
    return suggestQueries([...store.items.values()], [...store.concepts.values()], prefix, limit);
  }
}

export class LocalGraphService implements GraphService {
  constructor(private readonly env: LocalEnv) {}

  async getGraph(options?: GraphOptions): Promise<GraphData> {
    return buildGraph(this.env.store.state(), options);
  }

  async getNeighborhood(nodeId: string, depth = 1): Promise<GraphData> {
    return getNeighborhood(buildGraph(this.env.store.state()), nodeId, depth);
  }
}

export class LocalChatService implements ChatService {
  constructor(
    private readonly env: LocalEnv,
    private readonly composer: AnswerComposer | null,
  ) {}

  async ask(question: string): Promise<ChatAnswer> {
    const { store, now, ids } = this.env;
    const answer = await askKnowledge(question, {
      items: [...store.items.values()],
      concepts: [...store.concepts.values()],
      topics: [...store.topics.values()],
      composer: this.composer,
      now,
      idGenerator: ids,
    });
    await store.addChat(answer);
    return answer;
  }

  async getHistory(limit = 20): Promise<ChatAnswer[]> {
    return this.env.store.chat.slice(-limit);
  }

  async clearHistory(): Promise<void> {
    await this.env.store.clearChat();
  }
}

export class LocalReminderService implements ReminderService {
  constructor(private readonly env: LocalEnv) {}

  async list(filter: Parameters<ReminderService["list"]>[0] = {}): Promise<Reminder[]> {
    return [...this.env.store.reminders.values()]
      .filter((reminder) => filter.completed === undefined || reminder.completed === filter.completed)
      .filter((reminder) => filter.confirmed === undefined || reminder.confirmed === filter.confirmed)
      .filter((reminder) => !filter.sourceItemId || reminder.sourceItemId === filter.sourceItemId)
      .sort((a, b) => Number(a.completed) - Number(b.completed) || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
  }

  async create(input: ReminderInput): Promise<Reminder> {
    const { store, now, ids } = this.env;
    const reminder = createReminder(input, now(), ids("reminder"));
    await store.saveReminder(reminder);
    return reminder;
  }

  private require(id: string): Reminder {
    const reminder = this.env.store.reminders.get(id);
    if (!reminder) throw new Error(`Reminder not found: ${id}`);
    return reminder;
  }

  async update(id: string, patch: Parameters<ReminderService["update"]>[1]): Promise<Reminder> {
    const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    const next = { ...this.require(id), ...defined };
    await this.env.store.saveReminder(next);
    return next;
  }

  async confirm(id: string, patch: Parameters<ReminderService["confirm"]>[1] = {}): Promise<Reminder> {
    const updated = await this.update(id, patch);
    const confirmed = { ...updated, confirmed: true };
    await this.env.store.saveReminder(confirmed);
    return confirmed;
  }

  async setCompleted(id: string, completed: boolean): Promise<Reminder> {
    const next: Reminder = {
      ...this.require(id),
      completed,
      completedAt: completed ? this.env.now().toISOString() : undefined,
    };
    await this.env.store.saveReminder(next);
    return next;
  }

  async remove(id: string): Promise<void> {
    await this.env.store.removeReminder(id);
  }

  async suggestFromItem(itemId: string): Promise<ReminderSuggestion[]> {
    const item = this.env.store.items.get(itemId);
    if (!item) throw new Error(`Item not found: ${itemId}`);
    return suggestReminders(item, this.env.now());
  }
}

export class LocalShareService implements ShareService {
  constructor(
    private readonly env: LocalEnv,
    private readonly shareEnv: ShareEnv = {},
  ) {}

  private target(request: ShareRequest): ShareTarget {
    const { store } = this.env;
    if (request.kind === "collection") {
      const topic = store.topics.get(request.topicId);
      if (!topic) throw new Error(`Collection not found: ${request.topicId}`);
      const items = [...store.items.values()]
        .filter((item) => item.status === "ready" && item.concepts.some((id) => topic.conceptIds.includes(id)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { kind: "collection", topic, items };
    }
    const item = store.items.get(request.itemId);
    if (!item) throw new Error(`Item not found: ${request.itemId}`);
    return { kind: request.kind, item };
  }

  canShareNatively(): boolean {
    return canShareNatively(this.shareEnv);
  }

  async buildPayload(request: ShareRequest): Promise<SharePayload> {
    return buildSharePayload(this.target(request));
  }

  async share(request: ShareRequest): Promise<ShareResult> {
    return shareContent(this.target(request), this.shareEnv);
  }
}

interface DiscoveryCache {
  pastInsight?: { itemId: string; reason: string };
  connectedConcept?: { conceptId: string; itemIds: string[]; reason: string };
  revisit?: { itemId: string; reason: string };
}

export class LocalDiscoveryService implements DiscoveryService {
  constructor(private readonly env: LocalEnv) {}

  /** Selection is cached per calendar day so Today's Discovery does not reshuffle as the user opens items. */
  async getDailyDiscovery(): Promise<DailyDiscovery> {
    const { store, now } = this.env;
    const today = now();
    const key = `discovery:${localDateKey(today)}`;
    const cached = await store.repository.getMeta<DiscoveryCache>(key);
    const hydrated = cached ? this.hydrate(localDateKey(today), cached) : undefined;
    if (hydrated) return hydrated;

    const state = store.state();
    const fresh = selectDailyDiscovery(state.items, state.concepts, state.relationships, today);
    await store.repository.setMeta(key, {
      pastInsight: fresh.pastInsight && { itemId: fresh.pastInsight.item.id, reason: fresh.pastInsight.reason },
      connectedConcept: fresh.connectedConcept && {
        conceptId: fresh.connectedConcept.concept.id,
        itemIds: fresh.connectedConcept.items.map((item) => item.id),
        reason: fresh.connectedConcept.reason,
      },
      revisit: fresh.revisit && { itemId: fresh.revisit.item.id, reason: fresh.revisit.reason },
    } satisfies DiscoveryCache);
    return fresh;
  }

  private hydrate(date: string, cache: DiscoveryCache): DailyDiscovery | undefined {
    const { store } = this.env;
    const discovery: DailyDiscovery = { date };
    if (cache.pastInsight) {
      const item = store.items.get(cache.pastInsight.itemId);
      if (!item) return undefined;
      discovery.pastInsight = { item, reason: cache.pastInsight.reason };
    }
    if (cache.connectedConcept) {
      const concept = store.concepts.get(cache.connectedConcept.conceptId);
      const items = cache.connectedConcept.itemIds.map((id) => store.items.get(id));
      if (!concept || items.some((item) => !item)) return undefined;
      discovery.connectedConcept = { concept: concept as KnowledgeConcept, items: items as KnowledgeItem[], reason: cache.connectedConcept.reason };
    }
    if (cache.revisit) {
      const item = store.items.get(cache.revisit.itemId);
      if (!item) return undefined;
      discovery.revisit = { item, reason: cache.revisit.reason };
    }
    return discovery;
  }

  async getExploreDeck(mode: DeckMode = "for-you"): Promise<KnowledgeItem[]> {
    return buildExploreDeck([...this.env.store.items.values()], this.env.now(), mode);
  }

  async recordView(itemId: string, via: ViewSurface): Promise<ReviewState> {
    const { store, now, ids } = this.env;
    const item = store.items.get(itemId);
    if (!item) throw new Error(`Item not found: ${itemId}`);
    const at = now();
    const review = recordView(item.review, at);
    await store.saveItem({ ...item, review });
    await store.addHistory(createHistoryEntry(itemId, via, at, ids("history")));
    return review;
  }

  async getHistory(limit?: number): Promise<{ entry: HistoryEntry; item: KnowledgeItem }[]> {
    const { store } = this.env;
    return recentHistory(store.history, [...store.items.values()], limit);
  }

  async getProgress(): Promise<ExploreProgress> {
    return computeProgress([...this.env.store.items.values()], this.env.now());
  }
}

export class LocalDataService implements DataService {
  constructor(private readonly env: LocalEnv) {}

  async exportAll(): Promise<ExportBundle> {
    const { store, now } = this.env;
    return {
      version: DATA_VERSION,
      exportedAt: now().toISOString(),
      items: [...store.items.values()],
      concepts: [...store.concepts.values()],
      relationships: [...store.relationships.values()],
      topics: [...store.topics.values()],
      reminders: [...store.reminders.values()],
    };
  }

  async resetToDemo(): Promise<void> {
    const { store, now } = this.env;
    await resetToDemo(store.repository, now());
    await store.reload();
    store.emit("reset");
  }
}
