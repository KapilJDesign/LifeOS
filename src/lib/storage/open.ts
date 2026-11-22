import { IndexedDbRepository, isIndexedDbAvailable } from "./indexeddb-repository";
import { MemoryRepository } from "./memory-repository";
import type { Repository } from "./repository";

/** Opens the best available repository. Falls back to memory if IndexedDB is missing or fails to open. */
export async function openRepository(): Promise<Repository> {
  if (isIndexedDbAvailable()) {
    try {
      const repository = new IndexedDbRepository();
      await repository.open();
      return repository;
    } catch {
      // Private browsing or a blocked database: continue with memory.
    }
  }
  const memory = new MemoryRepository();
  await memory.open();
  return memory;
}
