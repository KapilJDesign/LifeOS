import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import { createDefaultServices } from "../services";
import type { CaptureInput, KnowledgeConcept, KnowledgeItem, Reminder } from "../types/knowledge";
import type { CaptureResult, CollectionSummary, Services } from "../services/types";

export type LoadStatus = "idle" | "loading" | "ready" | "error";

export interface LifeOSState {
  status: LoadStatus;
  error?: string;
  services?: Services;
  /** Snapshots kept fresh by service change events. Screens read these and call `services` for everything else. */
  items: KnowledgeItem[];
  concepts: KnowledgeConcept[];
  collections: CollectionSummary[];
  reminders: Reminder[];
  /** Ids of items currently being processed, for "AI is organising this" states. */
  processingIds: string[];
  init(): Promise<void>;
  refresh(): Promise<void>;
  /** Saves a capture and tracks its processing; resolves as soon as the item is saved, not when AI finishes. */
  capture(input: CaptureInput): Promise<CaptureResult>;
}

export type LifeOSStore = StoreApi<LifeOSState>;

/** Builds a store around a services factory so tests can inject in-memory services. */
export function createLifeOSStore(createServices: () => Promise<Services> = () => createDefaultServices()): LifeOSStore {
  let unsubscribe: (() => void) | undefined;
  let refreshQueued = false;
  let initializing: Promise<void> | undefined;

  const store = createStore<LifeOSState>((set, get) => ({
    status: "idle",
    items: [],
    concepts: [],
    collections: [],
    reminders: [],
    processingIds: [],

    async init() {
      if (get().status === "ready") return;
      initializing ??= (async () => {
        set({ status: "loading", error: undefined });
        try {
          const services = await createServices();
          set({ services });
          unsubscribe?.();
          unsubscribe = services.knowledge.subscribe(() => {
            if (refreshQueued) return;
            refreshQueued = true;
            queueMicrotask(() => {
              refreshQueued = false;
              void get().refresh();
            });
          });
          await get().refresh();
          set({ status: "ready" });
        } catch (error) {
          set({ status: "error", error: error instanceof Error ? error.message : String(error) });
        } finally {
          initializing = undefined;
        }
      })();
      return initializing;
    },

    async refresh() {
      const services = get().services;
      if (!services) return;
      const [items, concepts, collections, reminders] = await Promise.all([
        services.knowledge.listItems({ sort: "recent" }),
        services.knowledge.listConcepts(),
        services.knowledge.listCollections(),
        services.reminders.list(),
      ]);
      set({
        items,
        concepts,
        collections,
        reminders,
        processingIds: items.filter((item) => item.status === "pending" || item.status === "processing").map((item) => item.id),
      });
    },

    async capture(input) {
      const services = get().services;
      if (!services) throw new Error("Life OS is not ready yet");
      const result = await services.capture.capture(input);
      await get().refresh();
      return result;
    },
  }));
  return store;
}

export const lifeOSStore: LifeOSStore = createLifeOSStore();

export function useLifeOS<T>(selector: (state: LifeOSState) => T): T {
  return useStore(lifeOSStore, selector);
}

export function getServices(): Services {
  const services = lifeOSStore.getState().services;
  if (!services) throw new Error("Life OS services are not initialised. Call init() first.");
  return services;
}
