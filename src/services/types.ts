import type {
  CaptureInput,
  ChatAnswer,
  DailyDiscovery,
  ExploreProgress,
  HistoryEntry,
  KnowledgeConcept,
  KnowledgeItem,
  KnowledgeRelationship,
  RelationshipType,
  Reminder,
  ReviewState,
  TopicCollection,
  ViewSurface,
} from "../types/knowledge";
import type { DeckMode } from "../lib/discovery";
import type { GraphData, GraphOptions } from "../lib/graph/graph-builder";
import type { RelatedItem } from "../lib/graph/related";
import type { ReminderSuggestion } from "../lib/reminders";
import type { SearchFilters, SearchResult, SortMode } from "../lib/search/search";
import type { SharePayload, ShareResult } from "../lib/share/share";

/**
 * Service contracts that screens call. Every method is async so the local implementation can be replaced by
 * HTTP calls to the real backend without touching a screen. See "Service-to-endpoint mapping" in LifeOS-Architecture.md.
 */

export type Unsubscribe = () => void;

export type ChangeScope = "items" | "concepts" | "relationships" | "reminders" | "topics" | "history" | "chat" | "reset";

export interface ChangeEvent {
  scope: ChangeScope;
  ids?: string[];
}

export interface ItemQuery {
  filters?: SearchFilters;
  sort?: SortMode;
  limit?: number;
}

/** Editable fields. AI suggestions stay editable; `conceptNames` re-links the item in the graph. */
export interface ItemPatch {
  title?: string;
  summary?: string;
  content?: string;
  tags?: string[];
  keyTakeaways?: string[];
  actions?: string[];
  isFavorite?: boolean;
  conceptNames?: string[];
}

export interface ItemDetail {
  item: KnowledgeItem;
  concepts: KnowledgeConcept[];
  relatedItems: RelatedItem[];
  topics: TopicCollection[];
  reminders: Reminder[];
}

export interface ConceptDetail {
  concept: KnowledgeConcept;
  items: KnowledgeItem[];
  relatedConcepts: { concept: KnowledgeConcept; relationship: RelationshipType }[];
  topics: TopicCollection[];
}

export interface CollectionSummary {
  topic: TopicCollection;
  itemCount: number;
  concepts: KnowledgeConcept[];
  recentItems: KnowledgeItem[];
}

export interface KnowledgeService {
  listItems(query?: ItemQuery): Promise<KnowledgeItem[]>;
  getItem(id: string): Promise<KnowledgeItem | undefined>;
  getItemDetail(id: string): Promise<ItemDetail | undefined>;
  updateItem(id: string, patch: ItemPatch): Promise<KnowledgeItem>;
  toggleFavorite(id: string): Promise<KnowledgeItem>;
  deleteItem(id: string): Promise<void>;
  listConcepts(): Promise<KnowledgeConcept[]>;
  getConceptDetail(id: string): Promise<ConceptDetail | undefined>;
  listCollections(): Promise<CollectionSummary[]>;
  getCollection(id: string): Promise<CollectionSummary | undefined>;
  subscribe(listener: (event: ChangeEvent) => void): Unsubscribe;
}

export interface CaptureResult {
  /** The saved item. It is `pending` or `processing` until `processed` resolves. */
  item: KnowledgeItem;
  /** True when the same URL or text was already saved; nothing new was created. */
  duplicate: boolean;
  /** Resolves with the processed item. Never rejects: failures mark the item `failed`. Absent for duplicates. */
  processed?: Promise<KnowledgeItem>;
  /** Created when the capture kind is "reminder". */
  reminder?: Reminder;
}

export interface CaptureOptions {
  /** Set false to only save the item and process later (offline queue). Default true. */
  process?: boolean;
}

export interface CaptureService {
  capture(input: CaptureInput, options?: CaptureOptions): Promise<CaptureResult>;
  /** Parses a `/capture?...` query string (extension, bookmarklet, Shortcut, share target) and captures it. Null if empty. */
  captureFromQuery(search: string, options?: CaptureOptions): Promise<CaptureResult | null>;
  /** Runs or retries processing for one item. */
  process(itemId: string): Promise<KnowledgeItem>;
  /** Processes every pending or failed item, for example after coming back online. */
  processPending(): Promise<KnowledgeItem[]>;
}

export interface SearchService {
  search(query: string, options?: { filters?: SearchFilters; sort?: SortMode; limit?: number }): Promise<SearchResult[]>;
  suggest(prefix: string, limit?: number): Promise<string[]>;
}

export interface GraphService {
  getGraph(options?: GraphOptions): Promise<GraphData>;
  getNeighborhood(nodeId: string, depth?: number): Promise<GraphData>;
}

export interface ChatService {
  ask(question: string): Promise<ChatAnswer>;
  getHistory(limit?: number): Promise<ChatAnswer[]>;
  clearHistory(): Promise<void>;
}

export interface ReminderInput {
  title: string;
  description?: string;
  dueAt?: string;
  sourceItemId?: string;
}

export interface ReminderService {
  list(filter?: { completed?: boolean; sourceItemId?: string; confirmed?: boolean }): Promise<Reminder[]>;
  create(input: ReminderInput): Promise<Reminder>;
  update(id: string, patch: Partial<Pick<Reminder, "title" | "description" | "dueAt">>): Promise<Reminder>;
  /** Accepts an AI-suggested reminder, optionally editing it first. */
  confirm(id: string, patch?: Partial<Pick<Reminder, "title" | "description" | "dueAt">>): Promise<Reminder>;
  setCompleted(id: string, completed: boolean): Promise<Reminder>;
  remove(id: string): Promise<void>;
  suggestFromItem(itemId: string): Promise<ReminderSuggestion[]>;
}

export type ShareRequest =
  | { kind: "item" | "card" | "summary" | "source-link"; itemId: string }
  | { kind: "collection"; topicId: string };

export interface ShareService {
  canShareNatively(): boolean;
  buildPayload(request: ShareRequest): Promise<SharePayload>;
  share(request: ShareRequest): Promise<ShareResult>;
}

export interface DiscoveryService {
  getDailyDiscovery(): Promise<DailyDiscovery>;
  getExploreDeck(mode?: DeckMode): Promise<KnowledgeItem[]>;
  /** Call when a card or detail view is opened. Updates revisit tracking and the visible history. */
  recordView(itemId: string, via: ViewSurface): Promise<ReviewState>;
  getHistory(limit?: number): Promise<{ entry: HistoryEntry; item: KnowledgeItem }[]>;
  getProgress(): Promise<ExploreProgress>;
}

export interface ExportBundle {
  version: number;
  exportedAt: string;
  items: KnowledgeItem[];
  concepts: KnowledgeConcept[];
  relationships: KnowledgeRelationship[];
  topics: TopicCollection[];
  reminders: Reminder[];
}

export interface DataService {
  exportAll(): Promise<ExportBundle>;
  resetToDemo(): Promise<void>;
}

export interface Services {
  knowledge: KnowledgeService;
  capture: CaptureService;
  search: SearchService;
  graph: GraphService;
  chat: ChatService;
  reminders: ReminderService;
  share: ShareService;
  discovery: DiscoveryService;
  data: DataService;
}
