import { z } from "zod";
import type { ContentKind } from "../../types/knowledge";

export const CONTENT_KINDS: readonly ContentKind[] = [
  "note",
  "idea",
  "video",
  "reel",
  "article",
  "podcast",
  "voice_note",
  "journal",
  "conversation",
  "link",
];

function cleanList(max: number) {
  return z
    .array(z.string())
    .transform((values) => {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const raw of values) {
        const value = raw.replace(/^#+/, "").replace(/\s+/g, " ").trim();
        const key = value.toLowerCase();
        if (value && !seen.has(key)) {
          seen.add(key);
          result.push(value);
        }
      }
      return result.slice(0, max);
    });
}

/** LLMs sometimes invent a content type; map unknown values to the closest safe one instead of failing the whole result. */
const contentKindSchema = z
  .string()
  .transform((value): ContentKind => {
    const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if ((CONTENT_KINDS as readonly string[]).includes(key)) return key as ContentKind;
    if (key.includes("video") || key === "tutorial") return "video";
    if (key.includes("podcast") || key === "audio") return "podcast";
    if (key.includes("article") || key.includes("blog") || key === "post") return "article";
    if (key.includes("voice")) return "voice_note";
    if (key.includes("chat") || key.includes("conversation")) return "conversation";
    return "link";
  });

/** Output contract for the processing pipeline (brief section 11). Snake case matches the brief and the future API. */
export const processingOutputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "title is required")
    .transform((value) => value.slice(0, 160)),
  content_type: contentKindSchema,
  source: z.string().trim().min(1, "source is required"),
  url: z.string().trim().optional(),
  summary: z
    .string()
    .trim()
    .min(1, "summary is required")
    .transform((value) => value.slice(0, 600)),
  key_takeaways: cleanList(6).default([]),
  concepts: cleanList(10).refine((values) => values.length > 0, "at least one concept is required"),
  tags: cleanList(8).default([]),
  actions: cleanList(5).default([]),
  related_topics: cleanList(6).default([]),
});

export type ProcessingOutput = z.infer<typeof processingOutputSchema>;

export type ParseResult = { ok: true; data: ProcessingOutput } | { ok: false; error: string };

/** Pulls a JSON object out of raw model text, tolerating markdown fences and leading prose. */
export function extractJson(raw: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found in provider response");
  return JSON.parse(candidate.slice(start, end + 1));
}

export function parseProcessingOutput(raw: unknown): ParseResult {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = extractJson(raw);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON" };
    }
  }
  const parsed = processingOutputSchema.safeParse(value);
  if (parsed.success) return { ok: true, data: parsed.data };
  const message = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
  return { ok: false, error: message };
}
