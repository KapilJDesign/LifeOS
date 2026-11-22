import type { ChatAnswer } from "../../types/knowledge";
import type { ProcessRequest } from "./types";

export const PROCESSING_SYSTEM_PROMPT = [
  "You structure a saved item for a personal knowledge base.",
  "Respond with a single JSON object and nothing else, with exactly these keys:",
  "title, content_type, source, url, summary, key_takeaways, concepts, tags, actions, related_topics.",
  "content_type is one of: note, idea, video, reel, article, podcast, voice_note, journal, conversation, link.",
  "summary is at most two sentences. key_takeaways has 2-4 short strings. concepts has 2-6 Title Case names.",
  "Only use information present in the provided content, title and URL. If there is no readable content, say so in the summary and do not invent details.",
  "Prefer an existing concept name when one clearly applies.",
].join("\n");

export function buildProcessingMessages(request: ProcessRequest): { role: "system" | "user"; content: string }[] {
  const existing = request.existingConcepts.map((concept) => concept.name).slice(0, 60);
  const user = [
    `Capture type: ${request.type}`,
    `Source: ${request.platform}${request.sourceName ? ` (${request.sourceName})` : ""}`,
    request.url ? `URL: ${request.url}` : undefined,
    request.title ? `Title: ${request.title}` : undefined,
    existing.length ? `Existing concepts: ${existing.join(", ")}` : undefined,
    "Content:",
    request.content || "(none)",
  ]
    .filter(Boolean)
    .join("\n");
  return [
    { role: "system", content: PROCESSING_SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}

export const CHAT_SYSTEM_PROMPT = [
  "You answer questions using only the numbered sources provided.",
  "Cite every claim with its source number in square brackets, for example [1] or [2][3].",
  "Never cite a number that is not in the source list. If the sources do not answer the question, say you could not find it in the user's saved knowledge.",
  "Be concise and consolidate overlapping points.",
].join("\n");

export function buildChatMessages(
  question: string,
  sources: ChatAnswer["citations"],
): { role: "system" | "user"; content: string }[] {
  const list = sources.map((source) => `[${source.n}] ${source.title}: ${source.snippet}`).join("\n");
  return [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    { role: "user", content: `Sources:\n${list}\n\nQuestion: ${question}` },
  ];
}
