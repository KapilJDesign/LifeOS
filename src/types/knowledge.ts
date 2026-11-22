/**
 * Domain model. Extends brief section 9; every extension is documented in
 * 0_Requirements/LifeOS-Architecture.md ("Domain model").
 *
 * Conventions:
 * - Timestamps are ISO-8601 strings in UTC.
 * - Concept ids are deterministic slugs of the concept name (`slugify`), so
 *   the same concept created on two devices merges instead of duplicating.
 * - Original user input (`content`, `sourceUrl`, `createdAt`) is never
 *   overwritten by AI processing; AI only fills the enrichment fields.
 */

export type SourceType =
  | "text"
  | "voice"
  | "instagram"
  | "youtube"
  | "website"
  | "podcast"
  | "journal"
  | "chat";

/** What kind of thing the item is, independent of where it came from. */
export type ContentKind =
  | "note"
  | "idea"
  | "video"
  | "reel"
  | "article"
  | "podcast"
  | "voice_note"
  | "journal"
  | "conversation"
  | "link";

/** Icon-lookup key produced by the URL detector. */
export type PlatformKey =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "x"
  | "linkedin"
  | "reddit"
  | "github"
  | "medium"
  | "substack"
  | "spotify"
  | "apple-podcasts"
  | "podcast"
  | "website"
  | "text"
  | "voice"
  | "journal"
  | "chat";

/** Where an item entered the inbox. */
export type CaptureOrigin =
  | "in-app"
  | "voice"
  | "extension"
  | "share-target"
  | "bookmarklet"
  | "shortcut"
  | "clipboard"
  | "import"
  | "seed";

/** Capture-time hint that overrides auto-detection. */
export type CaptureKind = "text" | "url" | "voice" | "journal" | "chat" | "reminder";

export type ItemStatus = "pending" | "processing" | "ready" | "failed";

export interface ReviewState {
  viewCount: number;
  firstViewedAt?: string;
  lastViewedAt?: string;
  /** Spaced-revisit due date; items past this are "due" for the Explore deck. */
  nextReviewAt?: string;
}

export interface ProcessingInfo {
  provider: string;
  /** True when the primary provider failed validation or errored and the mock produced the result. */
  usedFallback: boolean;
  error?: string;
  completedAt?: string;
  attempts: number;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  /** Original text as captured. Never replaced by AI output. */
  content: string;
  summary: string;
  sourceType: SourceType;
  contentKind: ContentKind;
  platform: PlatformKey;
  /** Original URL exactly as captured. */
  sourceUrl?: string;
  sourceName?: string;
  thumbnail?: string;
  tags: string[];
  /** Concept ids (slugs). The inverse index is `KnowledgeConcept.itemIds`. */
  concepts: string[];
  keyTakeaways: string[];
  /** Actionable insights suggested by processing. */
  actions: string[];
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  status: ItemStatus;
  origin: CaptureOrigin;
  review: ReviewState;
  processing?: ProcessingInfo;
}

export interface KnowledgeConcept {
  id: string;
  name: string;
  description: string;
  /** Alternate names used when matching new captures, e.g. "Model Context Protocol" for MCP. */
  aliases: string[];
  itemIds: string[];
}

export type RelationshipType =
  | "related"
  | "part_of"
  | "supports"
  | "inspired_by"
  | "contradicts"
  | "derived_from";

export type RelationshipEndpoint = "item" | "concept";

export interface KnowledgeRelationship {
  id: string;
  sourceId: string;
  sourceKind: RelationshipEndpoint;
  targetId: string;
  targetKind: RelationshipEndpoint;
  relationship: RelationshipType;
  origin: "seed" | "ai" | "user";
}

/** Curated or AI-derived grouping shown as a topic collection and as a graph topic node. */
export interface TopicCollection {
  id: string;
  name: string;
  description: string;
  conceptIds: string[];
  /** Key into the UI's icon map. */
  icon: string;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueAt?: string;
  completed: boolean;
  completedAt?: string;
  sourceItemId?: string;
  createdAt: string;
  /** AI-suggested reminders stay unconfirmed until the user accepts or edits them. */
  confirmed: boolean;
}

export interface Citation {
  /** 1-based number matching `[n]` markers inside the answer text. */
  n: number;
  itemId: string;
  title: string;
  snippet: string;
  sourceUrl?: string;
}

export interface ChatAnswer {
  id: string;
  question: string;
  /** Plain text with `[n]` citation markers. */
  answer: string;
  citations: Citation[];
  /** False when nothing relevant was found; the answer then says so and cites nothing. */
  grounded: boolean;
  relatedConcepts: string[];
  followUps: string[];
  provider: string;
  createdAt: string;
}

export interface CaptureInput {
  origin: CaptureOrigin;
  kind?: CaptureKind;
  text?: string;
  url?: string;
  title?: string;
  /** User note attached by the extension popup or share sheet. */
  note?: string;
  capturedAt?: string;
}

export interface DiscoverySlot {
  item: KnowledgeItem;
  reason: string;
}

export interface DailyDiscovery {
  /** Local calendar day (YYYY-MM-DD); selection is stable within a day. */
  date: string;
  pastInsight?: DiscoverySlot;
  connectedConcept?: {
    concept: KnowledgeConcept;
    items: KnowledgeItem[];
    reason: string;
  };
  revisit?: DiscoverySlot;
}

export type ViewSurface = "explore" | "detail" | "discovery" | "search" | "chat" | "graph";

export interface HistoryEntry {
  id: string;
  itemId: string;
  viewedAt: string;
  via: ViewSurface;
}

export interface ExploreProgress {
  total: number;
  seen: number;
  unseen: number;
  revisited: number;
  due: number;
  /** 0..1 fraction of items opened at least once. */
  seenFraction: number;
}
