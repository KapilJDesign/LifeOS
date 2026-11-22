import { describe, expect, it, vi } from "vitest";
import { ingestCapture } from "./inbound";
import {
  BrowserTranscriber,
  MockTranscriber,
  createTranscriber,
  detectVoiceSupport,
  type RecognitionLike,
} from "./voice";

class FakeRecognition implements RecognitionLike {
  static last: FakeRecognition;
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: RecognitionLike["onresult"] = null;
  onerror: RecognitionLike["onerror"] = null;
  onend: RecognitionLike["onend"] = null;
  constructor() {
    FakeRecognition.last = this;
  }
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn(() => this.onend?.());
  emit(parts: { text: string; isFinal: boolean }[], resultIndex = 0) {
    this.onresult?.({
      resultIndex,
      results: parts.map((part) => Object.assign([{ transcript: part.text }], { isFinal: part.isFinal })) as never,
    });
  }
}

describe("browser transcriber", () => {
  it("streams interim text and delivers one final transcript on stop", () => {
    const onInterim = vi.fn();
    const onFinal = vi.fn();
    const session = new BrowserTranscriber(FakeRecognition, "en-GB").start({ onInterim, onFinal });
    const fake = FakeRecognition.last;
    expect(fake).toMatchObject({ lang: "en-GB", continuous: true, interimResults: true });
    expect(fake.start).toHaveBeenCalled();

    fake.emit([{ text: "An idea about", isFinal: true }]);
    fake.emit([{ text: "An idea about", isFinal: true }, { text: "local models", isFinal: false }], 1);
    expect(onInterim).toHaveBeenLastCalledWith("An idea about local models");

    session.stop();
    session.stop();
    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith("An idea about", "browser");
  });

  it("maps errors and reports no-speech when nothing was heard", () => {
    const onError = vi.fn();
    new BrowserTranscriber(FakeRecognition).start({ onFinal: vi.fn(), onError });
    FakeRecognition.last.onerror?.({ error: "not-allowed" });
    FakeRecognition.last.onend?.();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "not-allowed" }));
    expect(onError).toHaveBeenCalledTimes(1);

    const silent = vi.fn();
    const session = new BrowserTranscriber(FakeRecognition).start({ onFinal: vi.fn(), onError: silent });
    session.stop();
    expect(silent).toHaveBeenCalledWith(expect.objectContaining({ code: "no-speech" }));
  });
});

describe("mock transcriber and selection", () => {
  it("returns a deterministic canned transcript that becomes a voice item", () => {
    const onFinal = vi.fn();
    const mock = new MockTranscriber(["First idea.", "Second idea."]);
    mock.start({ onFinal }).stop();
    mock.start({ onFinal }).stop();
    expect(onFinal.mock.calls).toEqual([["First idea.", "mock"], ["Second idea.", "mock"]]);

    const { item } = ingestCapture({ origin: "voice", kind: "voice", text: onFinal.mock.calls[0][0] });
    expect(item).toMatchObject({ sourceType: "voice", contentKind: "voice_note", origin: "voice" });
  });

  it("does not deliver after abort", () => {
    const onFinal = vi.fn();
    const session = new MockTranscriber().start({ onFinal });
    session.abort();
    session.stop();
    expect(onFinal).not.toHaveBeenCalled();
  });

  it("uses real recognition when the browser has it, otherwise the mock", () => {
    expect(createTranscriber({ webkitSpeechRecognition: FakeRecognition }).source).toBe("browser");
    expect(createTranscriber({}).source).toBe("mock");
    expect(detectVoiceSupport({ SpeechRecognition: FakeRecognition, isSecureContext: true, navigator: { mediaDevices: {} } })).toEqual({
      recognition: true,
      microphone: true,
    });
    expect(detectVoiceSupport({ isSecureContext: false })).toEqual({ recognition: false, microphone: false });
  });
});
