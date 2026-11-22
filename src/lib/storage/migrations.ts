import type { Repository } from "./repository";

/** Current shape version of stored records. Bump together with a new entry in `DATA_MIGRATIONS`. */
export const DATA_VERSION = 1;
const DATA_VERSION_KEY = "dataVersion";

export interface DataMigration {
  /** The data version this migration produces. */
  to: number;
  description: string;
  run(repository: Repository): Promise<void>;
}

/** Record-shape migrations, applied in order after the database opens. Version 1 is the initial shape. */
export const DATA_MIGRATIONS: readonly DataMigration[] = [];

/**
 * Brings stored data up to date. A fresh database is stamped with the target version without running anything.
 * Returns the versions that were applied.
 */
export async function runDataMigrations(
  repository: Repository,
  migrations: readonly DataMigration[] = DATA_MIGRATIONS,
  target: number = migrations.reduce((max, migration) => Math.max(max, migration.to), DATA_VERSION),
): Promise<number[]> {
  const stored = await repository.getMeta<number>(DATA_VERSION_KEY);
  if (stored === undefined) {
    await repository.setMeta(DATA_VERSION_KEY, target);
    return [];
  }
  const applied: number[] = [];
  const pending = [...migrations].filter((migration) => migration.to > stored && migration.to <= target).sort((a, b) => a.to - b.to);
  for (const migration of pending) {
    await migration.run(repository);
    await repository.setMeta(DATA_VERSION_KEY, migration.to);
    applied.push(migration.to);
  }
  return applied;
}
