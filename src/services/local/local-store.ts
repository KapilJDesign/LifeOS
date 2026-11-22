import type {
  ChatAnswer,
  HistoryEntry,
  KnowledgeConcept,
  KnowledgeItem,
  KnowledgeRelationship,
  Reminder,
  TopicCollection,
} from "../../types/knowledge";
import type { KnowledgeState } from "../../lib/graph/graph-builder";
import type { Repository } from "../../lib/storage/repository";
import { ensureSeeded } from "../../lib/storage/seed";
import { runDataMigrations } from "../../lib/storage/migrations";
import type { ChangeEvent, ChangeScope } from "../types";

const CHAT_HISTORY_LIMIT = 50;
const HISTORY_LIMIT = 2000;

/**
 * Working set for the local services: an in-memory copy of every store, written through to the repository.
 * Reads are synchronous against the cache; writes persist first and then notify subscribers.
 * A real backend replaces this whole class with a server-backed cache (see the sync section of the architecture document).
 */
export class LocalStore {
  items = new Map<string, KnowledgeItem>();
  concepts = new Map<string, KnowledgeConcept>();
  relationships = new Map<string, KnowledgeRelationship>();
  reminders = new Map<string, Reminder>();
  topics = new Map<string, TopicCollection>();
  history: HistoryEntry[] = [];
  chat: ChatAnswer[] = [];
  private listeners = new Set<(event: ChangeEvent) => void>();

  constructor(
    readonly repository: Repository,
    private readonly now: () => Date,
  ) {}

  async load(options: { seed?: boolean } = {}): Promise<void> {
    await this.repository.open();
    await runDataMigrations(this.repository);
    if (options.seed ?? true) await ensureSeeded(this.repository, this.now());
    await this.reload();
  }

  async reload(): Promise<void> {
    const [items, concepts, relationships, reminders, topics, history, chat] = await Promise.all([
      this.repository.getAll("items"),
      this.repository.getAll("concepts"),
      this.repository.getAll("relationships"),
      this.repository.getAll("reminders"),
      this.repository.getAll("topics"),
      this.repository.getAll("history"),
      this.repository.getAll("chat"),
    ]);
    this.items = new Map(items.map((entry) => [entry.id, entry]));
    this.concepts = new Map(concepts.map((entry) => [entry.id, entry]));
    this.relationships = new Map(relationships.map((entry) => [entry.id, entry]));
    this.reminders = new Map(reminders.map((entry) => [entry.id, entry]));
    this.topics = new Map(topics.map((entry) => [entry.id, entry]));
    this.history = history.sort((a, b) => a.viewedAt.localeCompare(b.viewedAt));
    this.chat = chat.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  state(): KnowledgeState {
    return {
      items: [...this.items.values()],
      concepts: [...this.concepts.values()],
      relationships: [...this.relationships.values()],
      topics: [...this.topics.values()],
    };
  }

  subscribe(listener: (event: ChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(scope: ChangeScope, ids?: string[]): void {
    for (const listener of [...this.listeners]) listener({ scope, ids });
  }

  async saveItems(items: readonly KnowledgeItem[]): Promise<void> {
    await this.repository.putMany("items", items);
    for (const item of items) this.items.set(item.id, item);
    this.emit("items", items.map((item) => item.id));
  }

  async saveItem(item: KnowledgeItem): Promise<void> {
    await this.saveItems([item]);
  }

  async removeItem(id: string): Promise<void> {
    await this.repository.delete("items", id);
    this.items.delete(id);
    const touchedConcepts = [...this.concepts.values()].filter((concept) => concept.itemIds.includes(id));
    await this.saveConcepts(touchedConcepts.map((concept) => ({ ...concept, itemIds: concept.itemIds.filter((itemId) => itemId !== id) })));
    const staleRelations = [...this.relationships.values()].filter(
      (rel) => (rel.sourceKind === "item" && rel.sourceId === id) || (rel.targetKind === "item" && rel.targetId === id),
    );
    for (const rel of staleRelations) {
      await this.repository.delete("relationships", rel.id);
      this.relationships.delete(rel.id);
    }
    const staleHistory = this.history.filter((entry) => entry.itemId === id);
    for (const entry of staleHistory) await this.repository.delete("history", entry.id);
    this.history = this.history.filter((entry) => entry.itemId !== id);
    for (const reminder of this.reminders.values()) {
      if (reminder.sourceItemId === id) await this.saveReminder({ ...reminder, sourceItemId: undefined });
    }
    this.emit("items", [id]);
    this.emit("relationships");
    this.emit("history");
  }

  async saveConcepts(concepts: readonly KnowledgeConcept[]): Promise<void> {
    if (concepts.length === 0) return;
    await this.repository.putMany("concepts", concepts);
    for (const concept of concepts) this.concepts.set(concept.id, concept);
    this.emit("concepts", concepts.map((concept) => concept.id));
  }

  async saveRelationships(relationships: readonly KnowledgeRelationship[]): Promise<void> {
    if (relationships.length === 0) return;
    await this.repository.putMany("relationships", relationships);
    for (const relationship of relationships) this.relationships.set(relationship.id, relationship);
    this.emit("relationships", relationships.map((relationship) => relationship.id));
  }

  async saveTopics(topics: readonly TopicCollection[]): Promise<void> {
    if (topics.length === 0) return;
    await this.repository.putMany("topics", topics);
    for (const topic of topics) this.topics.set(topic.id, topic);
    this.emit("topics", topics.map((topic) => topic.id));
  }

  async saveReminder(reminder: Reminder): Promise<void> {
    await this.repository.put("reminders", reminder);
    this.reminders.set(reminder.id, reminder);
    this.emit("reminders", [reminder.id]);
  }

  async removeReminder(id: string): Promise<void> {
    await this.repository.delete("reminders", id);
    this.reminders.delete(id);
    this.emit("reminders", [id]);
  }

  async addHistory(entry: HistoryEntry): Promise<void> {
    await this.repository.put("history", entry);
    this.history.push(entry);
    if (this.history.length > HISTORY_LIMIT) {
      const dropped = this.history.splice(0, this.history.length - HISTORY_LIMIT);
      for (const old of dropped) await this.repository.delete("history", old.id);
    }
    this.emit("history", [entry.id]);
  }

  async addChat(answer: ChatAnswer): Promise<void> {
    await this.repository.put("chat", answer);
    this.chat.push(answer);
    if (this.chat.length > CHAT_HISTORY_LIMIT) {
      const dropped = this.chat.splice(0, this.chat.length - CHAT_HISTORY_LIMIT);
      for (const old of dropped) await this.repository.delete("chat", old.id);
    }
    this.emit("chat", [answer.id]);
  }

  async clearChat(): Promise<void> {
    await this.repository.clear("chat");
    this.chat = [];
    this.emit("chat");
  }
}
