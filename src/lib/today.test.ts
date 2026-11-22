import { describe, expect, it } from "vitest";
import type { KnowledgeItem, LifeDetails, Reminder, SourceType } from "../types/knowledge";
import { buildToday, isLifeItem } from "./today";

const NOW = new Date("2026-11-22T14:00:00");
const iso = (hoursFromNow: number) => new Date(NOW.getTime() + hoursFromNow * 3_600_000).toISOString();

function item(id: string, sourceType: SourceType, life?: LifeDetails, createdHoursAgo = 2): KnowledgeItem {
  return {
    id,
    title: id,
    content: "",
    summary: "",
    sourceType,
    contentKind: "note",
    platform: "text",
    tags: [],
    concepts: [],
    keyTakeaways: [],
    actions: [],
    createdAt: iso(-createdHoursAgo),
    updatedAt: iso(-createdHoursAgo),
    isFavorite: false,
    status: "ready",
    origin: "seed",
    review: { viewCount: 0 },
    life,
  };
}

function reminder(id: string, dueHours: number, sourceItemId?: string): Reminder {
  return { id, title: id, dueAt: iso(dueHours), completed: false, sourceItemId, createdAt: iso(-1), confirmed: true };
}

describe("today schedule", () => {
  it("marks meetings done, now, next and later, and ignores other days", () => {
    const meeting = (id: string, from: number, to: number) => item(id, "meeting", { startsAt: iso(from), endsAt: iso(to) });
    const view = buildToday(
      [meeting("past", -3, -2), meeting("current", -0.25, 0.25), meeting("soon", 1, 2), meeting("late", 3, 4), meeting("tomorrow", 24, 25)],
      [],
      NOW,
    );
    expect(view.schedule.map((entry) => [entry.item.id, entry.state])).toEqual([
      ["past", "done"],
      ["current", "now"],
      ["soon", "next"],
      ["late", "later"],
    ]);
    expect(view.meetingsLeft).toBe(3);
  });
});

describe("today priorities", () => {
  it("ranks time-critical life reminders above replies, and drops far-off reading reminders", () => {
    const items = [
      item("call", "call", undefined),
      item("email", "email", { needsReply: true, priority: "high", people: ["Sana"] }, 26),
      item("article", "website"),
    ];
    const view = buildToday(
      items,
      [reminder("soon", 0.5, "call"), reminder("read-later", 20, "article"), reminder("next-week", 24 * 8, "article")],
      NOW,
    );
    expect(view.priorities.map((p) => p.key)).toEqual(["rem:soon", "item:email"]);
    expect(view.priorities[1].title).toBe("Reply to Sana: email");
  });

  it("does not list a reply twice when an open reminder already covers it", () => {
    const view = buildToday([item("email", "email", { needsReply: true, people: ["Dan"] })], [reminder("answer-dan", 2, "email")], NOW);
    expect(view.priorities.map((p) => p.key)).toEqual(["rem:answer-dan"]);
    expect(view.repliesOwed).toBe(1);
  });

  it("turns a missed call into a callback and splits the list after three", () => {
    const missed = item("missed", "call", { needsReply: true, priority: "high", people: ["Dr. Mehta"] });
    const view = buildToday(
      [missed],
      [reminder("a", 0.5), reminder("b", 1), reminder("c", 1.5)],
      NOW,
    );
    expect(view.top).toHaveLength(3);
    expect(view.more.map((p) => p.kind)).toEqual(["callback"]);
    expect(view.more[0].title).toBe("Call back Dr. Mehta");
  });

  it("drops a reply once the user marks it done", () => {
    const view = buildToday([item("email", "email", { needsReply: false })], [], NOW);
    expect(view.priorities).toEqual([]);
    expect(view.repliesOwed).toBe(0);
  });
});

describe("isLifeItem", () => {
  it("separates day-to-day items from saved knowledge", () => {
    expect(["meeting", "email", "call", "health"].every((t) => isLifeItem({ sourceType: t as SourceType }))).toBe(true);
    expect(["website", "voice", "journal"].some((t) => isLifeItem({ sourceType: t as SourceType }))).toBe(false);
  });
});
