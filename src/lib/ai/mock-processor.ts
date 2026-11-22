import type { ContentKind } from "../../types/knowledge";
import { uniqueStrings } from "../ids";
import { lookupDemoMetadata } from "./demo-urls";
import { CONCEPT_LEXICON, findLexiconEntry } from "./lexicon";
import type { AIProvider, ConceptRef, ProcessRequest } from "./types";
import type { ProcessingOutput } from "./schema";

const STOPWORDS = new Set(
  (
    "a an and are as at be been but by can could do does for from had has have how i if in into is it its just like " +
    "me more my of on or our out so some than that the their them then there these they this to up us was we were " +
    "what when where which who why will with would you your about also very really been being over under after before " +
    "not no yes get got make made much many one two new use used using want need needs should today note notes " +
    "blog post posts article articles www html index page news watch status"
  ).split(/\s+/),
);

const ACTION_CUES =
  /\b(try|explore|build|read|watch|follow up|follow-up|remember to|need to|should|todo|to-do|check out|look into|learn|test|sketch|audit|rewrite|set up|schedule)\b/i;

const KIND_TAG: Partial<Record<ContentKind, string>> = {
  video: "Video",
  reel: "Reel",
  article: "Article",
  podcast: "Podcast",
  voice_note: "Voice note",
  journal: "Journal",
  conversation: "AI chat",
  idea: "Idea",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(haystack: string, phrase: string): number {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(phrase.toLowerCase())}(?![a-z0-9])`, "g");
  return haystack.match(pattern)?.length ?? 0;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((part) => part.length > 0);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function titleCase(value: string): string {
  return value.replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

function urlWords(url: string | undefined, lastSegmentOnly = false): string {
  if (!url) return "";
  try {
    const segments = decodeURIComponent(new URL(url).pathname).split("/").filter(Boolean);
    const chosen = lastSegmentOnly ? segments.slice(-1) : segments;
    return chosen.join(" ").replace(/[-_.]+/g, " ");
  } catch {
    return "";
  }
}

interface ConceptMatch {
  name: string;
  score: number;
}

function matchConcepts(haystack: string, existing: ConceptRef[]): ConceptMatch[] {
  const matches = new Map<string, ConceptMatch>();

  for (const entry of CONCEPT_LEXICON) {
    let score = countOccurrences(haystack, entry.name) * 3;
    for (const alias of entry.aliases) score += countOccurrences(haystack, alias) * 2;
    for (const keyword of entry.keywords) score += countOccurrences(haystack, keyword);
    if (score > 0) matches.set(entry.name.toLowerCase(), { name: entry.name, score });
  }

  // User-created concepts outside the lexicon still link: reuse their exact name.
  for (const concept of existing) {
    if (findLexiconEntry(concept.name)) continue;
    const names = [concept.name, ...concept.aliases];
    const score = names.reduce((sum, name) => sum + countOccurrences(haystack, name) * 3, 0);
    if (score > 0) matches.set(concept.name.toLowerCase(), { name: concept.name, score });
  }

  return [...matches.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function fallbackConcept(haystack: string, request: ProcessRequest): string {
  const tokens = haystack.split(/[^a-z0-9]+/).filter((token) => token.length >= 3 && !STOPWORDS.has(token) && !/^\d+$/.test(token));
  if (!request.content.trim() && tokens.length > 0) {
    // No body to analyse (a bare link or a title only): use the leading words of the title or URL slug.
    return titleCase(uniqueStrings(tokens).slice(0, 2).join(" "));
  }
  const counts = new Map<string, number>();
  for (const token of tokens) if (token.length >= 4) counts.set(token, (counts.get(token) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  if (top) return titleCase(top);
  return request.sourceName ? titleCase(request.sourceName) : "Saved Items";
}

function isGenericTitle(title: string | undefined): boolean {
  return !title || /^untitled capture$/i.test(title) || /\blink$/i.test(title);
}

function deriveTitle(request: ProcessRequest, words: string): string {
  if (!isGenericTitle(request.title)) return request.title!.trim();
  const firstSentence = splitSentences(request.content)[0];
  if (firstSentence) {
    const title = firstSentence.length <= 80 ? firstSentence.replace(/[.!?]+$/, "") : `${firstSentence.slice(0, 77).trimEnd()}…`;
    if (title.trim()) return title;
  }
  const slug = words.trim();
  if (slug) return titleCase(slug.slice(0, 80));
  return request.title?.trim() || "Untitled capture";
}

function deriveSummary(request: ProcessRequest, concepts: string[]): string {
  const sentences = splitSentences(request.content);
  if (sentences.length > 0) {
    const joined = sentences.slice(0, 2).join(" ");
    return joined.length <= 260 ? joined : `${joined.slice(0, 257).trimEnd()}…`;
  }
  const source = request.sourceName ?? "the web";
  const about = concepts.slice(0, 3).join(", ");
  return `Saved from ${source}${about ? `, likely about ${about}` : ""}. The original link is kept; open it to read the full content.`;
}

function deriveTakeaways(request: ProcessRequest, concepts: string[]): string[] {
  const sentences = splitSentences(request.content).filter((sentence) => wordCount(sentence) >= 5);
  if (sentences.length >= 2) return sentences.slice(0, 3).map((sentence) => sentence.replace(/[.]+$/, ""));
  const insights = concepts
    .map((name) => findLexiconEntry(name)?.insight)
    .filter((insight): insight is string => Boolean(insight));
  const own = sentences[0] ? [sentences[0].replace(/[.]+$/, "")] : [];
  return uniqueStrings([...own, ...insights]).slice(0, 3);
}

function deriveActions(content: string): string[] {
  return uniqueStrings(
    splitSentences(content)
      .filter((sentence) => ACTION_CUES.test(sentence) && wordCount(sentence) <= 30)
      .map((sentence) => sentence.replace(/[.]+$/, "")),
  ).slice(0, 3);
}

function deriveKind(request: ProcessRequest, concepts: string[]): ContentKind {
  if (request.contentKind === "note" && concepts.includes("Product Ideas")) return "idea";
  return request.contentKind;
}

export function mockProcess(request: ProcessRequest): ProcessingOutput {
  const demo = lookupDemoMetadata(request.url);
  if (demo) {
    return { ...demo, source: request.platform, url: request.url };
  }

  const words = urlWords(request.url);
  const haystack = `${request.title ?? ""} ${request.content} ${words}`.toLowerCase();
  const slugTitle = urlWords(request.url, true);
  const matches = matchConcepts(haystack, request.existingConcepts);
  const concepts = matches.slice(0, 5).map((match) => match.name);
  if (concepts.length === 0) concepts.push(fallbackConcept(haystack, request));

  const tags = uniqueStrings([
    ...concepts.flatMap((name) => findLexiconEntry(name)?.tags ?? []),
    ...(KIND_TAG[request.contentKind] ? [KIND_TAG[request.contentKind]!] : []),
  ]).slice(0, 6);

  const related = uniqueStrings(concepts.flatMap((name) => findLexiconEntry(name)?.related ?? []))
    .filter((name) => !concepts.some((concept) => concept.toLowerCase() === name.toLowerCase()))
    .slice(0, 3);

  return {
    title: deriveTitle(request, slugTitle),
    content_type: deriveKind(request, concepts),
    source: request.platform,
    url: request.url,
    summary: deriveSummary(request, concepts),
    key_takeaways: deriveTakeaways(request, concepts),
    concepts,
    tags: tags.length > 0 ? tags : ["Saved"],
    actions: deriveActions(request.content),
    related_topics: related,
  };
}

/** Deterministic, offline provider: same input always yields the same output. */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async process(request: ProcessRequest): Promise<ProcessingOutput> {
    return mockProcess(request);
  }
}
