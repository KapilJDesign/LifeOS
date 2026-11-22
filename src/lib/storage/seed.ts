import { createDemoKnowledge, SEED_VERSION } from "../../data/demo-knowledge";
import type { Repository } from "./repository";

const SEED_KEY = "seedVersion";

/** Loads the demo knowledge on first launch only. Existing user data is never replaced. Returns true if seeded. */
export async function ensureSeeded(repository: Repository, now: Date = new Date()): Promise<boolean> {
  if ((await repository.getMeta<number>(SEED_KEY)) !== undefined) return false;
  await writeDemo(repository, now);
  return true;
}

/** Wipes everything and reloads the demo data. Used by "Reset demo data". */
export async function resetToDemo(repository: Repository, now: Date = new Date()): Promise<void> {
  const dataVersion = await repository.getMeta<number>("dataVersion");
  await repository.clear();
  if (dataVersion !== undefined) await repository.setMeta("dataVersion", dataVersion);
  await writeDemo(repository, now);
}

async function writeDemo(repository: Repository, now: Date): Promise<void> {
  const demo = createDemoKnowledge(now);
  await repository.putMany("items", demo.items);
  await repository.putMany("concepts", demo.concepts);
  await repository.putMany("relationships", demo.relationships);
  await repository.putMany("topics", demo.topics);
  await repository.putMany("reminders", demo.reminders);
  await repository.putMany("history", demo.history);
  await repository.setMeta(SEED_KEY, SEED_VERSION);
}
