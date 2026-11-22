/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "llm" enables the LLM provider; anything else uses the deterministic mock. */
  readonly VITE_AI_PROVIDER?: string;
  readonly VITE_LLM_API_KEY?: string;
  readonly VITE_LLM_ENDPOINT?: string;
  readonly VITE_LLM_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
