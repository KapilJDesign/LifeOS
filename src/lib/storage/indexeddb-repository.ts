import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction, type StoreNames } from "idb";
import { STORE_NAMES, type Repository, type StoreMap, type StoreName } from "./repository";

/** Bump when object stores or indexes change and add an entry to `UPGRADES`. Record-shape changes use data migrations instead. */
export const DB_VERSION = 1;
export const DB_NAME = "life-os";

interface MetaRecord {
  key: string;
  value: unknown;
}

interface LifeOSDB extends DBSchema {
  items: { key: string; value: StoreMap["items"]; indexes: { "by-createdAt": string; "by-status": string } };
  concepts: { key: string; value: StoreMap["concepts"] };
  relationships: { key: string; value: StoreMap["relationships"] };
  reminders: { key: string; value: StoreMap["reminders"] };
  topics: { key: string; value: StoreMap["topics"] };
  history: { key: string; value: StoreMap["history"]; indexes: { "by-itemId": string; "by-viewedAt": string } };
  chat: { key: string; value: StoreMap["chat"] };
  meta: { key: string; value: MetaRecord };
}

type UpgradeTx = IDBPTransaction<LifeOSDB, StoreNames<LifeOSDB>[], "versionchange">;
type Upgrade = (db: IDBPDatabase<LifeOSDB>, tx: UpgradeTx) => void;

/** Structural upgrades keyed by the version they produce. Each runs once, in order. */
const UPGRADES: Record<number, Upgrade> = {
  1: (db) => {
    const items = db.createObjectStore("items", { keyPath: "id" });
    items.createIndex("by-createdAt", "createdAt");
    items.createIndex("by-status", "status");
    const history = db.createObjectStore("history", { keyPath: "id" });
    history.createIndex("by-itemId", "itemId");
    history.createIndex("by-viewedAt", "viewedAt");
    db.createObjectStore("concepts", { keyPath: "id" });
    db.createObjectStore("relationships", { keyPath: "id" });
    db.createObjectStore("reminders", { keyPath: "id" });
    db.createObjectStore("topics", { keyPath: "id" });
    db.createObjectStore("chat", { keyPath: "id" });
    db.createObjectStore("meta", { keyPath: "key" });
  },
};

export class IndexedDbRepository implements Repository {
  private db?: IDBPDatabase<LifeOSDB>;

  constructor(private readonly name: string = DB_NAME) {}

  async open(): Promise<void> {
    if (this.db) return;
    this.db = await openDB<LifeOSDB>(this.name, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, tx) {
        for (let version = oldVersion + 1; version <= (newVersion ?? DB_VERSION); version += 1) {
          UPGRADES[version]?.(db, tx as UpgradeTx);
        }
      },
    });
  }

  private connection(): IDBPDatabase<LifeOSDB> {
    if (!this.db) throw new Error("Repository is not open. Call open() first.");
    return this.db;
  }

  async getAll<S extends StoreName>(store: S): Promise<StoreMap[S][]> {
    return (await this.connection().getAll(store)) as StoreMap[S][];
  }

  async get<S extends StoreName>(store: S, id: string): Promise<StoreMap[S] | undefined> {
    return (await this.connection().get(store, id)) as StoreMap[S] | undefined;
  }

  async put<S extends StoreName>(store: S, value: StoreMap[S]): Promise<void> {
    await this.connection().put(store, value as never);
  }

  async putMany<S extends StoreName>(store: S, values: readonly StoreMap[S][]): Promise<void> {
    const tx = this.connection().transaction(store, "readwrite");
    await Promise.all([...values.map((value) => tx.store.put(value as never)), tx.done]);
  }

  async delete(store: StoreName, id: string): Promise<void> {
    await this.connection().delete(store, id);
  }

  async clear(store?: StoreName): Promise<void> {
    const db = this.connection();
    if (store) {
      await db.clear(store);
      return;
    }
    const names: StoreNames<LifeOSDB>[] = [...STORE_NAMES, "meta"];
    const tx = db.transaction(names, "readwrite");
    await Promise.all([...names.map((name) => tx.objectStore(name).clear()), tx.done]);
  }

  async getMeta<T>(key: string): Promise<T | undefined> {
    const record = await this.connection().get("meta", key);
    return record?.value as T | undefined;
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    await this.connection().put("meta", { key, value });
  }

  close(): void {
    this.db?.close();
    this.db = undefined;
  }
}

/** IndexedDB when the browser offers it, otherwise memory (data then lasts for the session only). */
export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
