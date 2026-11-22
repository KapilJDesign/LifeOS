import type { KnowledgeItem, Reminder } from "../types/knowledge";

export interface ReminderSuggestion {
  title: string;
  dueAt?: string;
  /** Short explanation for the confirm-or-edit prompt. */
  reason: string;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function atHour(date: Date, hour: number): Date {
  const copy = new Date(date);
  copy.setHours(hour, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Understands the phrases people actually write: "tomorrow", "this weekend", "next week", "on friday", "in 3 days". */
export function parseDueHint(text: string, now: Date): string | undefined {
  const lower = text.toLowerCase();

  if (/\b(tonight)\b/.test(lower)) return atHour(now, 20).toISOString();
  if (/\b(today)\b/.test(lower)) return atHour(now, Math.max(now.getHours() + 1, 17)).toISOString();
  if (/\btomorrow\b/.test(lower)) return atHour(addDays(now, 1), 9).toISOString();
  if (/\bthis weekend\b/.test(lower)) {
    const untilSaturday = (6 - now.getDay() + 7) % 7;
    return atHour(addDays(now, untilSaturday === 0 && now.getHours() >= 18 ? 7 : untilSaturday), 10).toISOString();
  }
  if (/\bnext week\b/.test(lower)) {
    const untilMonday = ((1 - now.getDay() + 7) % 7) || 7;
    return atHour(addDays(now, untilMonday), 9).toISOString();
  }

  const relative = /\bin (\d{1,2}) (day|days|week|weeks)\b/.exec(lower);
  if (relative) {
    const amount = Number(relative[1]) * (relative[2].startsWith("week") ? 7 : 1);
    return atHour(addDays(now, amount), 9).toISOString();
  }

  const weekday = new RegExp(`\\b(?:on |this |next )?(${WEEKDAYS.join("|")})\\b`).exec(lower);
  if (weekday) {
    const target = WEEKDAYS.indexOf(weekday[1]);
    const ahead = ((target - now.getDay() + 7) % 7) || 7;
    return atHour(addDays(now, ahead), 9).toISOString();
  }
  return undefined;
}

/** Turns an item's suggested actions into reminders the user can confirm or edit. */
export function suggestReminders(item: KnowledgeItem, now: Date): ReminderSuggestion[] {
  return item.actions.map((action) => ({
    title: action.replace(/^[a-z]/, (letter) => letter.toUpperCase()),
    dueAt: parseDueHint(action, now),
    reason: `Suggested from "${item.title}"`,
  }));
}

export function createReminder(
  input: { title: string; description?: string; dueAt?: string; sourceItemId?: string; confirmed?: boolean },
  now: Date,
  id: string,
): Reminder {
  return {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    dueAt: input.dueAt,
    completed: false,
    sourceItemId: input.sourceItemId,
    createdAt: now.toISOString(),
    confirmed: input.confirmed ?? true,
  };
}
