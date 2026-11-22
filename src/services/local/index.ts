import { MockAIProvider } from "../../lib/ai/mock-processor";
import type { AnswerComposer } from "../../lib/ai/llm-provider";
import type { AIProvider } from "../../lib/ai/types";
import { defaultIdGenerator, type IdGenerator } from "../../lib/ids";
import { openRepository } from "../../lib/storage/open";
import type { Repository } from "../../lib/storage/repository";
import type { ShareEnv } from "../../lib/share/share";
import type { Services } from "../types";
import { LocalCaptureService } from "./capture-service";
import { LocalKnowledgeService, type LocalEnv } from "./knowledge-service";
import { LocalStore } from "./local-store";
import {
  LocalChatService,
  LocalDataService,
  LocalDiscoveryService,
  LocalGraphService,
  LocalReminderService,
  LocalSearchService,
  LocalShareService,
} from "./misc-services";

export interface LocalServicesOptions {
  /** Defaults to IndexedDB with a memory fallback. */
  repository?: Repository;
  aiProvider?: AIProvider;
  /** Used when the provider fails or returns invalid JSON. `false` marks the item failed instead. Default: mock. */
  fallbackProvider?: AIProvider | false;
  composer?: AnswerComposer | null;
  now?: () => Date;
  idGenerator?: IdGenerator;
  shareEnv?: ShareEnv;
  /** Load the demo knowledge on first launch. Default true. */
  seed?: boolean;
  /** Process captures right after saving. Default true. */
  autoProcess?: boolean;
  processTimeoutMs?: number;
}

export interface LocalRuntime {
  services: Services;
  store: LocalStore;
}

export async function createLocalRuntime(options: LocalServicesOptions = {}): Promise<LocalRuntime> {
  const now = options.now ?? (() => new Date());
  const repository = options.repository ?? (await openRepository());
  const store = new LocalStore(repository, now);
  await store.load({ seed: options.seed });

  const env: LocalEnv = { store, now, ids: options.idGenerator ?? defaultIdGenerator };
  const services: Services = {
    knowledge: new LocalKnowledgeService(env),
    capture: new LocalCaptureService(env, {
      autoProcess: options.autoProcess,
      processing: {
        provider: options.aiProvider ?? new MockAIProvider(),
        fallback: options.fallbackProvider,
        timeoutMs: options.processTimeoutMs,
      },
    }),
    search: new LocalSearchService(env),
    graph: new LocalGraphService(env),
    chat: new LocalChatService(env, options.composer ?? null),
    reminders: new LocalReminderService(env),
    share: new LocalShareService(env, options.shareEnv),
    discovery: new LocalDiscoveryService(env),
    data: new LocalDataService(env),
  };
  return { services, store };
}

export async function createLocalServices(options: LocalServicesOptions = {}): Promise<Services> {
  return (await createLocalRuntime(options)).services;
}
