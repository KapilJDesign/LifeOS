import type { CaptureKind, ContentKind, KnowledgeItem, PlatformKey, SourceType } from "../../types/knowledge";
import { detectUrl } from "../capture/url-detector";
import { MockAIProvider, mockProcess } from "./mock-processor";
import { parseProcessingOutput, type ProcessingOutput } from "./schema";
import type { AIProvider, ConceptRef, ProcessRequest } from "./types";

export interface ProcessInput {
  content: string;
  /** Capture type hint: text, url, voice, journal or chat. */
  type: CaptureKind | SourceType | string;
  url?: string;
  title?: string;
  existingConcepts?: ConceptRef[];
  sourceType?: SourceType;
  contentKind?: ContentKind;
  platform?: PlatformKey;
  sourceName?: string;
}

export interface ProcessOptions {
  provider?: AIProvider;
  /** Used when the provider errors, times out or returns invalid JSON. Pass `false` to surface the failure instead. */
  fallback?: AIProvider | false;
  timeoutMs?: number;
}

export interface ProcessResult {
  output: ProcessingOutput;
  provider: string;
  usedFallback: boolean;
  /** Why the primary provider was not used, when `usedFallback` is true. */
  error?: string;
}

export class ProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProcessingError";
  }
}

const DEFAULT_TIMEOUT_MS = 20_000;

function defaultsFor(type: string): { sourceType: SourceType; contentKind: ContentKind; platform: PlatformKey } {
  switch (type) {
    case "voice":
      return { sourceType: "voice", contentKind: "voice_note", platform: "voice" };
    case "journal":
      return { sourceType: "journal", contentKind: "journal", platform: "journal" };
    case "chat":
      return { sourceType: "chat", contentKind: "conversation", platform: "chat" };
    default:
      return { sourceType: "text", contentKind: "note", platform: "text" };
  }
}

/** Steps 1 and 2 of the pipeline: identify the source and collect the content that is available without scraping. */
export function buildProcessRequest(input: ProcessInput): ProcessRequest {
  const detected = input.url ? detectUrl(input.url) : null;
  const base = detected
    ? {
        sourceType: detected.sourceType,
        contentKind: detected.contentKind,
        platform: detected.platform,
        sourceName: detected.sourceName,
      }
    : { ...defaultsFor(input.type), sourceName: undefined };

  return {
    content: input.content ?? "",
    type: input.type,
    url: detected?.url ?? input.url,
    title: input.title,
    sourceType: input.sourceType ?? base.sourceType,
    contentKind: input.contentKind ?? base.contentKind,
    platform: input.platform ?? base.platform,
    sourceName: input.sourceName ?? base.sourceName,
    existingConcepts: input.existingConcepts ?? [],
  };
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Provider timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([run(controller.signal), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runProvider(
  provider: AIProvider,
  request: ProcessRequest,
  timeoutMs: number,
): Promise<{ ok: true; output: ProcessingOutput } | { ok: false; error: string }> {
  try {
    const raw = await withTimeout((signal) => provider.process(request, signal), timeoutMs);
    const parsed = parseProcessingOutput(raw);
    return parsed.ok ? { ok: true, output: parsed.data } : { ok: false, error: `Invalid output from ${provider.name}: ${parsed.error}` };
  } catch (error) {
    return { ok: false, error: `${provider.name} failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** The original URL and source are facts about the capture, not model output, so they always win. */
function pinOriginals(output: ProcessingOutput, request: ProcessRequest): ProcessingOutput {
  return { ...output, source: request.platform, url: request.url };
}

/**
 * Capture → detect source → extract → summarise → concepts → tags → related topics.
 * Validates provider output, falls back to the deterministic mock, and never throws unless
 * `fallback: false` is set. Saving must not depend on this function succeeding.
 */
export async function processCapture(input: ProcessInput, options: ProcessOptions = {}): Promise<ProcessResult> {
  const request = buildProcessRequest(input);
  const provider = options.provider ?? new MockAIProvider();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const primary = await runProvider(provider, request, timeoutMs);
  if (primary.ok) {
    return { output: pinOriginals(primary.output, request), provider: provider.name, usedFallback: false };
  }

  if (options.fallback === false) throw new ProcessingError(primary.error);

  const fallback = options.fallback ?? new MockAIProvider();
  const secondary = await runProvider(fallback, request, timeoutMs);
  if (secondary.ok) {
    return { output: pinOriginals(secondary.output, request), provider: fallback.name, usedFallback: true, error: primary.error };
  }

  // Last resort: the mock is deterministic and always valid, so reaching here means a custom fallback misbehaved.
  const parsed = parseProcessingOutput(mockProcess(request));
  if (!parsed.ok) throw new ProcessingError(parsed.error);
  return { output: pinOriginals(parsed.data, request), provider: "mock", usedFallback: true, error: primary.error };
}

export function requestFromItem(item: KnowledgeItem, existingConcepts: ConceptRef[]): ProcessInput {
  return {
    content: item.content,
    type: item.sourceType,
    url: item.sourceUrl,
    title: item.title,
    sourceType: item.sourceType,
    contentKind: item.contentKind,
    platform: item.platform,
    sourceName: item.sourceName,
    existingConcepts,
  };
}

/**
 * Merges processing output into an item. `content`, `sourceUrl`, `createdAt` and the origin are never touched.
 * Concept ids are assigned afterwards by `linkNewCapture`, which owns concept matching.
 */
export function applyProcessingResult(item: KnowledgeItem, result: ProcessResult, now: Date = new Date()): KnowledgeItem {
  const { output } = result;
  const timestamp = now.toISOString();
  return {
    ...item,
    title: output.title,
    summary: output.summary,
    keyTakeaways: output.key_takeaways,
    tags: output.tags,
    actions: output.actions,
    contentKind: output.content_type,
    status: "ready",
    updatedAt: timestamp,
    processing: {
      provider: result.provider,
      usedFallback: result.usedFallback,
      error: result.error,
      completedAt: timestamp,
      attempts: (item.processing?.attempts ?? 0) + 1,
    },
  };
}

export function markFailed(item: KnowledgeItem, error: string, now: Date = new Date()): KnowledgeItem {
  return {
    ...item,
    status: "failed",
    updatedAt: now.toISOString(),
    processing: {
      provider: item.processing?.provider ?? "unknown",
      usedFallback: false,
      error,
      attempts: (item.processing?.attempts ?? 0) + 1,
    },
  };
}
