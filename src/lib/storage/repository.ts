import type {
  ChatAnswer,
  HistoryEntry,
  KnowledgeConcept,
  KnowledgeItem,
  KnowledgeRelationship,
  Reminder,
  TopicCollection,
} from "../../types/knowledge";

export interface StoreMap {
  items: KnowledgeItem;
  concepts: KnowledgeConcept;
  relationships: KnowledgeRelationship;
  reminders: Reminder;
  topics: TopicCollection;
  history: HistoryEntry;
  chat: ChatAnswer;
}

export type StoreName = keyof StoreMap;

export const STORE_NAMES: readonly StoreName[] = [
  "items",
  "concepts",
  "relationships",
  "reminders",
  "topics",
  "history",
  "chat",
];

/**
 * The persistence port. The mock services depend on this interface only, so IndexedDB can be replaced by
 * an in-memory store (tests, private browsing) or by a sync client that talks to the real backend.
 * Every record is keyed by `id`.
 */
export interface Repository {
  open(): Promise<void>;
  getAll<S extends StoreName>(store: S): Promise<StoreMap[S][]>;
  get<S extends StoreName>(store: S, id: string): Promise<StoreMap[S] | undefined>;
  put<S extends StoreName>(store: S, value: StoreMap[S]): Promise<void>;
  putMany<S extends StoreName>(store: S, values: readonly StoreMap[S][]): Promise<void>;
  delete(store: StoreName, id: string): Promise<void>;
  clear(store?: StoreName): Promise<void>;
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
  close(): void;
}
