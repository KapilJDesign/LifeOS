import type { ContentKind, PlatformKey, SourceType } from "../../types/knowledge";

/** Existing concept the processor should prefer when a capture matches it. */
export interface ConceptRef {
  id: string;
  name: string;
  aliases: string[];
}

export interface ProcessRequest {
  content: string;
  /** Capture type hint (text, url, voice, journal, chat). */
  type: string;
  url?: string;
  title?: string;
  sourceType: SourceType;
  contentKind: ContentKind;
  platform: PlatformKey;
  sourceName?: string;
  existingConcepts: ConceptRef[];
}

/**
 * A provider returns untrusted JSON (an object or a JSON string). `processCapture` validates it,
 * so a provider never has to be trusted and can be swapped freely: mock, direct LLM, or backend API.
 */
export interface AIProvider {
  readonly name: string;
  process(request: ProcessRequest, signal?: AbortSignal): Promise<unknown>;
}
