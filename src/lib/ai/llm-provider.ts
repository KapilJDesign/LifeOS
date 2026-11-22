import { buildChatMessages, buildProcessingMessages } from "./prompts";
import { MockAIProvider } from "./mock-processor";
import type { AIProvider, ProcessRequest } from "./types";
import type { ChatAnswer } from "../../types/knowledge";

type Env = Record<string, string | boolean | undefined>;

export interface LlmConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

type ChatMessage = { role: "system" | "user"; content: string };

const DEFAULT_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * The LLM provider is off unless `VITE_AI_PROVIDER=llm` and a key are present.
 * Anything prefixed `VITE_` is bundled into client code, so a browser-side key is for local demos only.
 * Production routes these calls through the backend (see the architecture document).
 */
export function readLlmConfig(env: Env): LlmConfig | null {
  if (env.VITE_AI_PROVIDER !== "llm") return null;
  const apiKey = typeof env.VITE_LLM_API_KEY === "string" ? env.VITE_LLM_API_KEY.trim() : "";
  if (!apiKey) return null;
  return {
    apiKey,
    endpoint: (typeof env.VITE_LLM_ENDPOINT === "string" && env.VITE_LLM_ENDPOINT.trim()) || DEFAULT_ENDPOINT,
    model: (typeof env.VITE_LLM_MODEL === "string" && env.VITE_LLM_MODEL.trim()) || DEFAULT_MODEL,
  };
}

/** Minimal client for any OpenAI-compatible chat-completions endpoint. */
export class LlmClient {
  constructor(
    private readonly config: LlmConfig,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  async complete(messages: ChatMessage[], options: { json?: boolean; signal?: AbortSignal } = {}): Promise<string> {
    const response = await this.fetchImpl(this.config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.2,
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: options.signal,
    });
    if (!response.ok) throw new Error(`LLM request failed with status ${response.status}`);
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM response had no content");
    return content;
  }
}

export class LlmAIProvider implements AIProvider {
  readonly name = "llm";

  constructor(private readonly client: LlmClient) {}

  async process(request: ProcessRequest, signal?: AbortSignal): Promise<string> {
    return this.client.complete(buildProcessingMessages(request), { json: true, signal });
  }
}

export function resolveAIProvider(env: Env): AIProvider {
  const config = readLlmConfig(env);
  return config ? new LlmAIProvider(new LlmClient(config)) : new MockAIProvider();
}

/** Composes a grounded answer from numbered sources; the caller validates the citations it returns. */
export interface AnswerComposer {
  readonly name: string;
  compose(question: string, sources: ChatAnswer["citations"], signal?: AbortSignal): Promise<string>;
}

export class LlmAnswerComposer implements AnswerComposer {
  readonly name = "llm";

  constructor(private readonly client: LlmClient) {}

  compose(question: string, sources: ChatAnswer["citations"], signal?: AbortSignal): Promise<string> {
    return this.client.complete(buildChatMessages(question, sources), { signal });
  }
}

export function resolveAnswerComposer(env: Env): AnswerComposer | null {
  const config = readLlmConfig(env);
  return config ? new LlmAnswerComposer(new LlmClient(config)) : null;
}
