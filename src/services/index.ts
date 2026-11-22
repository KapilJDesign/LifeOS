import { resolveAIProvider, resolveAnswerComposer } from "../lib/ai/llm-provider";
import type { Services } from "./types";
import { createLocalServices, type LocalServicesOptions } from "./local";

export type { Services } from "./types";
export * from "./types";

/**
 * The one place that decides which implementation the app runs on.
 * Today: local services (IndexedDB + mock AI, or an LLM when VITE_AI_PROVIDER=llm).
 * Later: an HTTP implementation of the same `Services` interface backed by the Supabase API.
 */
export async function createDefaultServices(
  env: Record<string, string | boolean | undefined> = import.meta.env,
  overrides: LocalServicesOptions = {},
): Promise<Services> {
  return createLocalServices({
    aiProvider: resolveAIProvider(env),
    composer: resolveAnswerComposer(env),
    ...overrides,
  });
}
