import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { createDemoKnowledge } from "../../data/demo-knowledge";
import { IndexedDbRepository } from "./indexeddb-repository";
import { MemoryRepository } from "./memory-repository";
import { DATA_VERSION, runDataMigrations, type DataMigration } from "./migrations";
import type { Repository } from "./repository";
import { defaultSettings, loadSettings, saveSettings, SETTINGS_KEY, updateSettings, type KeyValueStorage } from "./settings";
import { ensureSeeded, resetToDemo } from "./seed";

const NOW = new Date("2026-11-22T10:00:00.000Z");

function fakeStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe.each([
  ["IndexedDB", () => new IndexedDbRepository(`life-os-test-${Math.random()}`)],
  ["memory", () => new MemoryRepository()],
])("%s repository", (_name, create) => {
  let repo: Repository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    repo = create();
    await repo.open();
  });

  it("round-trips every store", async () => {
    const demo = createDemoKnowledge(NOW);
    await repo.putMany("items", demo.items);
    await repo.putMany("concepts", demo.concepts);
    await repo.putMany("relationships", demo.relationships);
    await repo.putMany("topics", demo.topics);
    await repo.putMany("reminders", demo.reminders);
    await repo.putMany("history", demo.history);

    const byId = <T extends { id: string }>(list: T[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));
    expect(byId(await repo.getAll("items"))).toEqual(byId(demo.items));
    expect(byId(await repo.getAll("concepts"))).toEqual(byId(demo.concepts));
    expect(byId(await repo.getAll("relationships"))).toEqual(byId(demo.relationships));
    expect(byId(await repo.getAll("topics"))).toEqual(byId(demo.topics));
    expect(byId(await repo.getAll("reminders"))).toEqual(byId(demo.reminders));
    expect(byId(await repo.getAll("history"))).toEqual(byId(demo.history));
    expect(await repo.get("items", "item-mcp")).toEqual(demo.items.find((i) => i.id === "item-mcp"));
  });

  it("updates, deletes and clears", async () => {
    const [item] = createDemoKnowledge(NOW).items;
    await repo.put("items", item);
    await repo.put("items", { ...item, title: "Edited", isFavorite: !item.isFavorite });
    expect((await repo.get("items", item.id))?.title).toBe("Edited");
    await repo.delete("items", item.id);
    expect(await repo.get("items", item.id)).toBeUndefined();

    await repo.put("items", item);
    await repo.setMeta("k", { a: 1 });
    await repo.clear("items");
    expect(await repo.getAll("items")).toEqual([]);
    expect(await repo.getMeta("k")).toEqual({ a: 1 });
    await repo.clear();
    expect(await repo.getMeta("k")).toBeUndefined();
  });

  it("stores meta values", async () => {
    expect(await repo.getMeta("missing")).toBeUndefined();
    await repo.setMeta("seedVersion", 3);
    expect(await repo.getMeta<number>("seedVersion")).toBe(3);
  });
});

describe("IndexedDB persistence across connections (refresh)", () => {
  it("keeps data after closing and reopening the database", async () => {
    const name = `life-os-reload-${Math.random()}`;
    const first = new IndexedDbRepository(name);
    await first.open();
    await ensureSeeded(first, NOW);
    const [item] = await first.getAll("items");
    await first.put("items", { ...item, title: "Saved before refresh" });
    first.close();

    const second = new IndexedDbRepository(name);
    await second.open();
    expect((await second.getAll("items")).length).toBe(createDemoKnowledge(NOW).items.length);
    expect((await second.get("items", item.id))?.title).toBe("Saved before refresh");
    expect(await ensureSeeded(second, NOW)).toBe(false);
    second.close();
  });
});

describe("seeding", () => {
  it("seeds once, never overwrites user data, and can reset to the demo", async () => {
    const repo = new MemoryRepository();
    expect(await ensureSeeded(repo, NOW)).toBe(true);
    const demo = createDemoKnowledge(NOW);
    expect((await repo.getAll("items")).length).toBe(demo.items.length);

    await repo.delete("items", "item-mcp");
    expect(await ensureSeeded(repo, NOW)).toBe(false);
    expect(await repo.get("items", "item-mcp")).toBeUndefined();

    await resetToDemo(repo, NOW);
    expect(await repo.get("items", "item-mcp")).toBeDefined();
  });
});

describe("data migrations", () => {
  it("stamps a fresh database without running migrations", async () => {
    const repo = new MemoryRepository();
    expect(await runDataMigrations(repo)).toEqual([]);
    expect(await repo.getMeta("dataVersion")).toBe(DATA_VERSION);
  });

  it("applies pending migrations in order, once, and records the version", async () => {
    const repo = new MemoryRepository();
    await repo.setMeta("dataVersion", 1);
    const [item] = createDemoKnowledge(NOW).items;
    await repo.put("items", item);
    const log: number[] = [];
    const migrations: DataMigration[] = [
      {
        to: 3,
        description: "add nothing",
        run: async () => void log.push(3),
      },
      {
        to: 2,
        description: "rename tags",
        run: async (r) => {
          log.push(2);
          for (const entry of await r.getAll("items")) await r.put("items", { ...entry, tags: entry.tags.map((t) => t.toLowerCase()) });
        },
      },
    ];

    expect(await runDataMigrations(repo, migrations)).toEqual([2, 3]);
    expect(log).toEqual([2, 3]);
    expect(await repo.getMeta("dataVersion")).toBe(3);
    expect((await repo.get("items", item.id))?.tags).toEqual(item.tags.map((t) => t.toLowerCase()));
    expect(await runDataMigrations(repo, migrations)).toEqual([]);
  });
});

describe("settings (localStorage)", () => {
  it("returns defaults when nothing is stored and survives a round trip", () => {
    const storage = fakeStorage();
    expect(loadSettings(storage, "http://localhost:5173")).toEqual(defaultSettings("http://localhost:5173"));
    const saved = updateSettings({ theme: "dark", appUrl: "https://life.example.com" }, storage);
    expect(loadSettings(storage)).toEqual(saved);
    expect(loadSettings(storage).theme).toBe("dark");
  });

  it("falls back to defaults for corrupt or hostile values and trims the fingerprint list", () => {
    const storage = fakeStorage();
    storage.setItem(SETTINGS_KEY, "{not json");
    expect(loadSettings(storage, "http://x").theme).toBe("system");
    storage.setItem(SETTINGS_KEY, JSON.stringify({ theme: "neon", appUrl: 5, clipboardPrompt: "yes", seenClipboard: [1, "a"] }));
    expect(loadSettings(storage, "http://x")).toMatchObject({ theme: "system", appUrl: "http://x", clipboardPrompt: true, seenClipboard: ["a"] });

    saveSettings({ ...defaultSettings("http://x"), seenClipboard: Array.from({ length: 40 }, (_, i) => String(i)) }, storage);
    expect(loadSettings(storage).seenClipboard).toHaveLength(25);
  });
});
