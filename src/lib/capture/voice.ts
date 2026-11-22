/**
 * Voice capture, headless. Wraps the browser's SpeechRecognition (Chrome, Edge, Safari) behind a small interface
 * and provides a deterministic mock transcriber so the demo works where recognition is unavailable (Firefox, insecure
 * origins, denied microphone). The UI decides how to present `source: "mock"`; it must say the text is a demo.
 */

export type TranscriberSource = "browser" | "mock";

export interface VoiceHandlers {
  /** Live partial text while the user is speaking. */
  onInterim?(text: string): void;
  /** Called once with the final transcript after `stop()` or when recognition ends. */
  onFinal(text: string, source: TranscriberSource): void;
  onError?(error: VoiceError): void;
}

export type VoiceErrorCode = "not-allowed" | "no-speech" | "network" | "unsupported" | "aborted" | "unknown";

export interface VoiceError {
  code: VoiceErrorCode;
  message: string;
}

export interface VoiceSession {
  stop(): void;
  abort(): void;
}

export interface VoiceTranscriber {
  readonly source: TranscriberSource;
  start(handlers: VoiceHandlers): VoiceSession;
}

interface RecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}

interface RecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<RecognitionResultLike>;
}

export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type RecognitionConstructor = new () => RecognitionLike;

function errorFor(code: string): VoiceError {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return { code: "not-allowed", message: "Microphone access was blocked." };
    case "no-speech":
      return { code: "no-speech", message: "No speech was detected." };
    case "network":
      return { code: "network", message: "Speech recognition needs a network connection." };
    case "aborted":
      return { code: "aborted", message: "Recording was cancelled." };
    default:
      return { code: "unknown", message: `Speech recognition failed (${code}).` };
  }
}

export function getRecognitionConstructor(scope: unknown = typeof window !== "undefined" ? window : undefined): RecognitionConstructor | undefined {
  const holder = scope as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor } | undefined;
  return holder?.SpeechRecognition ?? holder?.webkitSpeechRecognition;
}

export class BrowserTranscriber implements VoiceTranscriber {
  readonly source = "browser" as const;

  constructor(
    private readonly Recognition: RecognitionConstructor,
    private readonly lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US",
  ) {}

  start(handlers: VoiceHandlers): VoiceSession {
    const recognition = new this.Recognition();
    recognition.lang = this.lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalText = "";
    let failed = false;
    let delivered = false;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += `${result[0].transcript} `;
        else interim += result[0].transcript;
      }
      handlers.onInterim?.(`${finalText}${interim}`.trim());
    };
    recognition.onerror = (event) => {
      failed = true;
      handlers.onError?.(errorFor(event.error));
    };
    recognition.onend = () => {
      if (delivered) return;
      delivered = true;
      const text = finalText.trim();
      if (text) handlers.onFinal(text, "browser");
      else if (!failed) handlers.onError?.(errorFor("no-speech"));
    };

    recognition.start();
    return { stop: () => recognition.stop(), abort: () => recognition.abort() };
  }
}

const MOCK_TRANSCRIPTS = [
  "Idea for a product: a weekly digest of everything I saved, grouped by topic, with one question to reflect on.",
  "Remember to explore building a local AI agent this weekend and compare it with a hosted model for privacy.",
  "Note to self: the design system should make the accessible choice the easy choice for every team.",
];

/** Deterministic demo transcriber. Returns a canned transcript when the session is stopped. */
export class MockTranscriber implements VoiceTranscriber {
  readonly source = "mock" as const;
  private cursor = 0;

  constructor(private readonly transcripts: readonly string[] = MOCK_TRANSCRIPTS) {}

  start(handlers: VoiceHandlers): VoiceSession {
    const text = this.transcripts[this.cursor % this.transcripts.length];
    this.cursor += 1;
    let done = false;
    return {
      stop: () => {
        if (done) return;
        done = true;
        handlers.onFinal(text, "mock");
      },
      abort: () => {
        done = true;
      },
    };
  }
}

export interface VoiceSupport {
  /** True when real speech recognition is available. */
  recognition: boolean;
  /** True when a microphone can be requested at all (needs a secure context). */
  microphone: boolean;
}

export function detectVoiceSupport(scope: unknown = typeof window !== "undefined" ? window : undefined): VoiceSupport {
  const env = scope as { isSecureContext?: boolean; navigator?: { mediaDevices?: unknown } } | undefined;
  return {
    recognition: Boolean(getRecognitionConstructor(scope)),
    microphone: Boolean(env?.isSecureContext && env.navigator?.mediaDevices),
  };
}

/** Real recognition when available, otherwise the mock so the capture flow never dead-ends. */
export function createTranscriber(scope?: unknown): VoiceTranscriber {
  const Recognition = getRecognitionConstructor(scope);
  return Recognition ? new BrowserTranscriber(Recognition) : new MockTranscriber();
}
