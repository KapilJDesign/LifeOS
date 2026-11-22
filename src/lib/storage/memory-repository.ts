import { STORE_NAMES, type Repository, type StoreMap, type StoreName } from "./repository";

/** In-memory repository for tests and for browsers where IndexedDB is unavailable (some private modes). */
export class MemoryRepository implements Repository {
  private stores = new Map<StoreName, Map<string, unknown>>(STORE_NAMES.map((name) => [name, new Map()]));
  private meta = new Map<string, unknown>();

  async open(): Promise<void> {}

  async getAll<S extends StoreName>(store: S): Promise<StoreMap[S][]> {
    return [...this.stores.get(store)!.values()].map((value) => structuredClone(value)) as StoreMap[S][];
  }

  async get<S extends StoreName>(store: S, id: string): Promise<StoreMap[S] | undefined> {
    const value = this.stores.get(store)!.get(id);
    return value === undefined ? undefined : (structuredClone(value) as StoreMap[S]);
  }

  async put<S extends StoreName>(store: S, value: StoreMap[S]): Promise<void> {
    this.stores.get(store)!.set((value as { id: string }).id, structuredClone(value));
  }

  async putMany<S extends StoreName>(store: S, values: readonly StoreMap[S][]): Promise<void> {
    for (const value of values) await this.put(store, value);
  }

  async delete(store: StoreName, id: string): Promise<void> {
    this.stores.get(store)!.delete(id);
  }

  async clear(store?: StoreName): Promise<void> {
    if (store) {
      this.stores.get(store)!.clear();
      return;
    }
    for (const map of this.stores.values()) map.clear();
    this.meta.clear();
  }

  async getMeta<T>(key: string): Promise<T | undefined> {
    return this.meta.has(key) ? (structuredClone(this.meta.get(key)) as T) : undefined;
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    this.meta.set(key, structuredClone(value));
  }

  close(): void {}
}
