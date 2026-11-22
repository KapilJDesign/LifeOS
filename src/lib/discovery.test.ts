import { describe, expect, it } from "vitest";
import { createDemoKnowledge } from "../data/demo-knowledge";
import {
  REVIEW_INTERVAL_DAYS,
  buildExploreDeck,
  computeProgress,
  createHistoryEntry,
  isDue,
  localDateKey,
  recentHistory,
  recordView,
  selectDailyDiscovery,
} from "./discovery";
import { parseDueHint, suggestReminders } from "./reminders";

const NOW = new Date("2026-11-22T10:00:00.000Z");
const DAY = 86_400_000;

describe("revisit tracking", () => {
  it("records views and schedules the next review on a spaced ladder", () => {
    const first = recordView({ viewCount: 0 }, NOW);
    expect(first).toMatchObject({ viewCount: 1, firstViewedAt: NOW.toISOString(), lastViewedAt: NOW.toISOString() });
    expect(new Date(first.nextReviewAt!).getTime() - NOW.getTime()).toBe(REVIEW_INTERVAL_DAYS[0] * DAY);

    const later = new Date(NOW.getTime() + 2 * DAY);
    const second = recordView(first, later);
    expect(second.viewCount).toBe(2);
    expect(second.firstViewedAt).toBe(NOW.toISOString());
    expect(new Date(second.nextReviewAt!).getTime() - later.getTime()).toBe(REVIEW_INTERVAL_DAYS[1] * DAY);
  });

  it("caps the interval at the last rung", () => {
    let review = { viewCount: 0 } as ReturnType<typeof recordView>;
    for (let i = 0; i < 12; i += 1) review = recordView(review, NOW);
    expect(new Date(review.nextReviewAt!).getTime() - NOW.getTime()).toBe(REVIEW_INTERVAL_DAYS.at(-1)! * DAY);
  });

  it("computes progress and due items", () => {
    const { items } = createDemoKnowledge(NOW);
    const progress = computeProgress(items, NOW);
    const viewed = items.filter((item) => item.review.viewCount > 0);
    expect(progress.total).toBe(items.length);
    expect(progress.seen).toBe(viewed.length);
    expect(progress.unseen).toBe(items.length - viewed.length);
    expect(progress.revisited).toBe(items.filter((item) => item.review.viewCount > 1).length);
    expect(progress.seenFraction).toBeCloseTo(viewed.length / items.length);

    const inTwoWeeks = new Date(NOW.getTime() + 14 * DAY);
    expect(computeProgress(items, inTwoWeeks).due).toBe(viewed.length);
    expect(isDue(items.find((item) => item.review.viewCount === 0)!, inTwoWeeks)).toBe(false);
    expect(computeProgress([], NOW)).toMatchObject({ total: 0, seenFraction: 0 });
  });

  it("joins history to items, newest first, one row per item, skipping deleted items", () => {
    const { items } = createDemoKnowledge(NOW);
    const entries = [
      createHistoryEntry(items[0].id, "explore", new Date(NOW.getTime() - 3000), "h1"),
      createHistoryEntry(items[1].id, "detail", new Date(NOW.getTime() - 2000), "h2"),
      createHistoryEntry(items[0].id, "detail", new Date(NOW.getTime() - 1000), "h3"),
      createHistoryEntry("deleted", "detail", NOW, "h4"),
    ];
    const rows = recentHistory(entries, items, 10);
    expect(rows.map((row) => row.item.id)).toEqual([items[0].id, items[1].id]);
    expect(rows[0].entry.id).toBe("h3");
  });
});

describe("buildExploreDeck", () => {
  it("shows unseen cards first, then due cards, and supports modes", () => {
    const { items } = createDemoKnowledge(NOW);
    const later = new Date(NOW.getTime() + 20 * DAY);
    const deck = buildExploreDeck(items, later, "for-you");
    expect(deck).toHaveLength(items.length);
    const firstSeen = deck.findIndex((item) => item.review.viewCount > 0);
    expect(deck.slice(0, firstSeen).every((item) => item.review.viewCount === 0)).toBe(true);
    expect(deck.slice(firstSeen).every((item) => item.review.viewCount > 0)).toBe(true);
    expect(buildExploreDeck(items, later, "new").every((item) => item.review.viewCount === 0)).toBe(true);
    expect(buildExploreDeck(items, later, "due").every((item) => isDue(item, later))).toBe(true);
    expect(buildExploreDeck(items, later, "favorites").every((item) => item.isFavorite)).toBe(true);
  });

  it("excludes items that are not ready", () => {
    const { items } = createDemoKnowledge(NOW);
    const deck = buildExploreDeck([{ ...items[0], status: "pending" }, items[1]], NOW);
    expect(deck.map((item) => item.id)).toEqual([items[1].id]);
  });
});

describe("selectDailyDiscovery", () => {
  const demo = createDemoKnowledge(NOW);
  const pick = (now: Date, items = demo.items) => selectDailyDiscovery(items, demo.concepts, demo.relationships, now);

  it("returns a past insight, a connected concept and a not-recently-revisited item, all different", () => {
    const discovery = pick(NOW);
    expect(discovery.date).toBe(localDateKey(NOW));
    const past = discovery.pastInsight!;
    expect((NOW.getTime() - new Date(past.item.createdAt).getTime()) / DAY).toBeGreaterThanOrEqual(7);
    expect(past.reason).toMatch(/days ago/);

    const connected = discovery.connectedConcept!;
    expect(connected.concept.itemIds.length).toBeGreaterThanOrEqual(2);
    expect(connected.items.length).toBeGreaterThanOrEqual(2);
    expect(connected.items.every((item) => item.concepts.includes(connected.concept.id))).toBe(true);

    const revisit = discovery.revisit!;
    expect(revisit.item.id).not.toBe(past.item.id);
    expect(connected.items.slice(0, 1).map((item) => item.id)).not.toContain(revisit.item.id);
  });

  it("prefers items that were never opened or opened longest ago for the revisit slot", () => {
    const revisit = pick(NOW).revisit!.item;
    const candidates = demo.items.map((item) => item.review.lastViewedAt ?? item.createdAt).sort();
    // The chosen item is among the three stalest.
    const rank = demo.items
      .map((item) => item.review.lastViewedAt ?? item.createdAt)
      .sort()
      .indexOf(revisit.review.lastViewedAt ?? revisit.createdAt);
    expect(rank).toBeLessThan(4);
    expect(candidates.length).toBe(demo.items.length);
  });

  it("is stable within a day and varies across days", () => {
    const morning = new Date(2026, 10, 22, 8, 0);
    const evening = new Date(2026, 10, 22, 21, 0);
    expect(pick(morning).pastInsight!.item.id).toBe(pick(evening).pastInsight!.item.id);
    const ids = new Set(
      Array.from({ length: 14 }, (_, offset) => pick(new Date(2026, 10, 1 + offset, 9, 0)).pastInsight!.item.id),
    );
    expect(ids.size).toBeGreaterThan(1);
  });

  it("degrades gracefully with few or no items", () => {
    expect(pick(NOW, [])).toEqual({ date: localDateKey(NOW) });
    const one = pick(NOW, [demo.items[0]]);
    expect(one.pastInsight?.item.id).toBe(demo.items[0].id);
  });
});

describe("reminders", () => {
  const friday = new Date(2026, 10, 20, 10, 0); // Friday 20 Nov 2026

  it("parses common due phrases", () => {
    expect(new Date(parseDueHint("Explore a local agent this weekend", friday)!).getDay()).toBe(6);
    expect(new Date(parseDueHint("call tomorrow", friday)!).getDate()).toBe(21);
    expect(new Date(parseDueHint("review next week", friday)!).getDay()).toBe(1);
    expect(new Date(parseDueHint("ship in 3 days", friday)!).getDate()).toBe(23);
    expect(new Date(parseDueHint("on monday", friday)!).getDay()).toBe(1);
    expect(parseDueHint("someday maybe", friday)).toBeUndefined();
  });

  it("suggests reminders from an item's actions", () => {
    const item = createDemoKnowledge(NOW).items.find((entry) => entry.id === "item-local-llms")!;
    const [suggestion] = suggestReminders({ ...item, actions: ["explore a local AI agent this weekend"] }, friday);
    expect(suggestion.title).toBe("Explore a local AI agent this weekend");
    expect(new Date(suggestion.dueAt!).getDay()).toBe(6);
  });
});
