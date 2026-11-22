import type { KnowledgeItem, Reminder } from "../types/knowledge";

/**
 * Today view: the day's schedule and a short ranked list of what needs attention.
 * Pure functions over items and reminders, so the same logic can run in a backend worker.
 * Meetings, emails, calls and health entries are ordinary items (see `KnowledgeItem.life`).
 */

const LIFE_TYPES: ReadonlySet<string> = new Set(["meeting", "email", "call", "health"]);

/** Priorities scoring below this stay in Reminders and off the Today screen. */
export const MIN_PRIORITY_SCORE = 30;
/** Today shows this many priorities; the rest sit behind a "more" disclosure. */
export const TOP_PRIORITY_COUNT = 3;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function isLifeItem(item: Pick<KnowledgeItem, "sourceType">): boolean {
  return LIFE_TYPES.has(item.sourceType);
}

export type ScheduleState = "done" | "now" | "next" | "later";

export interface ScheduleEntry {
  item: KnowledgeItem;
  state: ScheduleState;
}

export type PriorityKind = "reminder" | "reply" | "callback";

export interface Priority {
  /** Stable key: `rem:<reminderId>` or `item:<itemId>`. */
  key: string;
  kind: PriorityKind;
  score: number;
  /** Reminder title, or the item that is waiting on the user. */
  title: string;
  /** Item this priority came from, if any. */
  itemId?: string;
  /** Due time for reminders; received time for replies and callbacks. */
  at: string;
}

export interface TodayView {
  schedule: ScheduleEntry[];
  priorities: Priority[];
  top: Priority[];
  more: Priority[];
  meetingsLeft: number;
  repliesOwed: number;
}

function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function reminderScore(reminder: Reminder, source: KnowledgeItem | undefined, now: number): number {
  const hours = (new Date(reminder.dueAt ?? now + 30 * DAY).getTime() - now) / HOUR;
  let score = hours < 0 ? 95 : hours < 24 ? Math.max(40, 90 - hours * 8) : hours < 72 ? 30 : 10;
  // Reminders about reading and ideas rank below things that involve other people or your day.
  if (source && !isLifeItem(source)) score -= 25;
  return score;
}

export function buildToday(items: KnowledgeItem[], reminders: Reminder[], nowDate: Date = new Date()): TodayView {
  const now = nowDate.getTime();
  const dayStart = startOfDay(nowDate);
  const dayEnd = dayStart + DAY;
  const byId = new Map(items.map((item) => [item.id, item]));

  const schedule: ScheduleEntry[] = items
    .filter((item) => {
      const starts = item.life?.startsAt ? new Date(item.life.startsAt).getTime() : NaN;
      return starts >= dayStart && starts < dayEnd;
    })
    .sort((a, b) => new Date(a.life!.startsAt!).getTime() - new Date(b.life!.startsAt!).getTime())
    .map((item) => {
      const starts = new Date(item.life!.startsAt!).getTime();
      const ends = item.life?.endsAt ? new Date(item.life.endsAt).getTime() : starts;
      const state: ScheduleState = ends <= now ? "done" : starts <= now ? "now" : "later";
      return { item, state };
    });
  const next = schedule.find((entry) => entry.state === "later");
  if (next) next.state = "next";

  const openReminders = reminders.filter((reminder) => !reminder.completed);
  const tracked = new Set(openReminders.map((reminder) => reminder.sourceItemId).filter(Boolean));

  const priorities: Priority[] = openReminders.map((reminder) => ({
    key: `rem:${reminder.id}`,
    kind: "reminder",
    score: reminderScore(reminder, reminder.sourceItemId ? byId.get(reminder.sourceItemId) : undefined, now),
    title: reminder.title,
    itemId: reminder.sourceItemId,
    at: reminder.dueAt ?? reminder.createdAt,
  }));

  const waiting = items.filter((item) => item.life?.needsReply);
  for (const item of waiting) {
    if (tracked.has(item.id)) continue; // an open reminder already covers it
    const callback = item.sourceType === "call";
    const who = item.life?.people?.[0] ?? "";
    const ageDays = Math.max(0, (now - new Date(item.createdAt).getTime()) / DAY);
    priorities.push({
      key: `item:${item.id}`,
      kind: callback ? "callback" : "reply",
      score: 55 + Math.min(ageDays, 3) * 5 + (item.life?.priority === "high" ? 15 : 0),
      title: callback ? `Call back ${who}`.trim() : `Reply to ${who}: ${item.title.replace(/^Re:\s*/i, "")}`,
      itemId: item.id,
      at: item.createdAt,
    });
  }

  const ranked = priorities.filter((p) => p.score >= MIN_PRIORITY_SCORE).sort((a, b) => b.score - a.score);

  return {
    schedule,
    priorities: ranked,
    top: ranked.slice(0, TOP_PRIORITY_COUNT),
    more: ranked.slice(TOP_PRIORITY_COUNT),
    meetingsLeft: schedule.filter((entry) => entry.state !== "done").length,
    repliesOwed: waiting.length,
  };
}
