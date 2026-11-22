import type {
  DailyDiscovery,
  ExploreProgress,
  HistoryEntry,
  KnowledgeConcept,
  KnowledgeItem,
  KnowledgeRelationship,
  ReviewState,
  ViewSurface,
} from "../types/knowledge";

const DAY_MS = 86_400_000;
/** Spaced-revisit ladder: after the nth view the item is due again this many days later. */
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60];
const PAST_INSIGHT_MIN_AGE_DAYS = 7;

export type DeckMode = "for-you" | "new" | "due" | "favorites" | "all";

export function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(list: readonly T[], seed: string): T | undefined {
  return list.length === 0 ? undefined : list[hashString(seed) % list.length];
}

function daysBetween(fromIso: string, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - new Date(fromIso).getTime()) / DAY_MS));
}

function isReady(item: KnowledgeItem): boolean {
  return item.status === "ready";
}

/** Updates revisit tracking when an item is opened. */
export function recordView(review: ReviewState, now: Date): ReviewState {
  const viewCount = review.viewCount + 1;
  const interval = REVIEW_INTERVAL_DAYS[Math.min(viewCount - 1, REVIEW_INTERVAL_DAYS.length - 1)];
  return {
    viewCount,
    firstViewedAt: review.firstViewedAt ?? now.toISOString(),
    lastViewedAt: now.toISOString(),
    nextReviewAt: new Date(now.getTime() + interval * DAY_MS).toISOString(),
  };
}

export function createHistoryEntry(
  itemId: string,
  via: ViewSurface,
  now: Date,
  id: string,
): HistoryEntry {
  return { id, itemId, via, viewedAt: now.toISOString() };
}

export function isDue(item: KnowledgeItem, now: Date): boolean {
  const next = item.review.nextReviewAt;
  return item.review.viewCount > 0 && next !== undefined && next <= now.toISOString();
}

export function computeProgress(items: readonly KnowledgeItem[], now: Date): ExploreProgress {
  const ready = items.filter(isReady);
  const seen = ready.filter((item) => item.review.viewCount > 0).length;
  return {
    total: ready.length,
    seen,
    unseen: ready.length - seen,
    revisited: ready.filter((item) => item.review.viewCount > 1).length,
    due: ready.filter((item) => isDue(item, now)).length,
    seenFraction: ready.length === 0 ? 0 : seen / ready.length,
  };
}

/**
 * Orders the cards for the Explore swipe deck. "for-you" shows new cards first (newest first),
 * then cards due for a revisit, then everything else with the longest-unseen first.
 */
export function buildExploreDeck(items: readonly KnowledgeItem[], now: Date, mode: DeckMode = "for-you"): KnowledgeItem[] {
  const ready = items.filter(isReady);
  const byNewest = (a: KnowledgeItem, b: KnowledgeItem) => b.createdAt.localeCompare(a.createdAt);
  const byLeastRecentlySeen = (a: KnowledgeItem, b: KnowledgeItem) =>
    (a.review.lastViewedAt ?? "").localeCompare(b.review.lastViewedAt ?? "") || byNewest(a, b);

  switch (mode) {
    case "new":
      return ready.filter((item) => item.review.viewCount === 0).sort(byNewest);
    case "due":
      return ready.filter((item) => isDue(item, now)).sort(byLeastRecentlySeen);
    case "favorites":
      return ready.filter((item) => item.isFavorite).sort(byNewest);
    case "all":
      return [...ready].sort(byNewest);
    default: {
      const unseen = ready.filter((item) => item.review.viewCount === 0).sort(byNewest);
      const due = ready.filter((item) => isDue(item, now)).sort(byLeastRecentlySeen);
      const used = new Set([...unseen, ...due].map((item) => item.id));
      const rest = ready.filter((item) => !used.has(item.id)).sort(byLeastRecentlySeen);
      return [...unseen, ...due, ...rest];
    }
  }
}

/** Most recent views first, one row per item, joined with the item. Entries whose item was deleted are dropped. */
export function recentHistory(
  entries: readonly HistoryEntry[],
  items: readonly KnowledgeItem[],
  limit = 20,
): { entry: HistoryEntry; item: KnowledgeItem }[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const result: { entry: HistoryEntry; item: KnowledgeItem }[] = [];
  // Later entries win ties on the timestamp, so two views in the same millisecond keep their order.
  const newestFirst = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.viewedAt.localeCompare(a.entry.viewedAt) || b.index - a.index)
    .map(({ entry }) => entry);
  for (const entry of newestFirst) {
    const item = byId.get(entry.itemId);
    if (!item || seen.has(entry.itemId)) continue;
    seen.add(entry.itemId);
    result.push({ entry, item });
    if (result.length >= limit) break;
  }
  return result;
}

/**
 * Picks Today's Discovery. The choice is a pure function of the calendar day and the data,
 * so it is stable for the whole day unless items are added or removed.
 */
export function selectDailyDiscovery(
  items: readonly KnowledgeItem[],
  concepts: readonly KnowledgeConcept[],
  relationships: readonly KnowledgeRelationship[],
  now: Date,
): DailyDiscovery {
  const date = localDateKey(now);
  const ready = items.filter(isReady);
  const discovery: DailyDiscovery = { date };
  const used = new Set<string>();

  const withInsight = ready.filter((item) => item.keyTakeaways.length > 0 || item.summary);
  const aged = withInsight.filter((item) => daysBetween(item.createdAt, now) >= PAST_INSIGHT_MIN_AGE_DAYS);
  const pastPool = (aged.length > 0 ? aged : withInsight).sort((a, b) => a.id.localeCompare(b.id));
  const past = pick(pastPool, `${date}:past`);
  if (past) {
    used.add(past.id);
    const age = daysBetween(past.createdAt, now);
    discovery.pastInsight = {
      item: past,
      reason: age >= 1 ? `You saved this ${age} ${age === 1 ? "day" : "days"} ago` : "You saved this today",
    };
  }

  const degree = new Map<string, number>();
  for (const rel of relationships) {
    if (rel.sourceKind === "concept") degree.set(rel.sourceId, (degree.get(rel.sourceId) ?? 0) + 1);
    if (rel.targetKind === "concept") degree.set(rel.targetId, (degree.get(rel.targetId) ?? 0) + 1);
  }
  const readyIds = new Set(ready.map((item) => item.id));
  const connected = concepts
    .map((concept) => ({
      concept,
      itemIds: concept.itemIds.filter((id) => readyIds.has(id)),
      score: concept.itemIds.length + (degree.get(concept.id) ?? 0),
    }))
    .filter((entry) => entry.itemIds.length >= 2)
    .sort((a, b) => b.score - a.score || a.concept.id.localeCompare(b.concept.id))
    .slice(0, 5);
  const chosen = pick(connected, `${date}:concept`);
  if (chosen) {
    const byId = new Map(ready.map((item) => [item.id, item]));
    const conceptItems = chosen.itemIds
      .map((id) => byId.get(id)!)
      .sort((a, b) => Number(used.has(a.id)) - Number(used.has(b.id)) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3);
    discovery.connectedConcept = {
      concept: chosen.concept,
      items: conceptItems,
      reason: `${chosen.concept.name} links ${chosen.itemIds.length} things you've saved`,
    };
    for (const item of conceptItems.slice(0, 1)) used.add(item.id);
  }

  const stale = ready
    .filter((item) => !used.has(item.id))
    .sort(
      (a, b) =>
        (a.review.lastViewedAt ?? a.createdAt).localeCompare(b.review.lastViewedAt ?? b.createdAt) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 3);
  const revisit = pick(stale, `${date}:revisit`);
  if (revisit) {
    const last = revisit.review.lastViewedAt;
    discovery.revisit = {
      item: revisit,
      reason: last ? `Last opened ${daysBetween(last, now)} days ago` : "You haven't opened this yet",
    };
  }
  return discovery;
}
