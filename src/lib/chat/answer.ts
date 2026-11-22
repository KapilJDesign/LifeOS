import type { Citation, ChatAnswer, KnowledgeConcept, KnowledgeItem, TopicCollection } from "../../types/knowledge";
import type { AnswerComposer } from "../ai/llm-provider";
import { defaultIdGenerator, uniqueStrings, type IdGenerator } from "../ids";
import { searchItems } from "../search/search";

export interface AskDeps {
  items: readonly KnowledgeItem[];
  concepts: readonly KnowledgeConcept[];
  topics?: readonly TopicCollection[];
  /** A real LLM composer. When absent, or when its output fails citation validation, the deterministic composer is used. */
  composer?: AnswerComposer | null;
  maxSources?: number;
  now?: () => Date;
  idGenerator?: IdGenerator;
}

export interface RetrievedSource {
  item: KnowledgeItem;
  score: number;
  snippet: string;
}

/** Words that shape the question but should not be searched for. */
const QUESTION_WORDS = new Set(
  (
    "what whats which who how why when where did do does done i me my mine we us our you show tell give list find " +
    "search look about saved save saving stored have has had learned learn learnt know knowledge content items item " +
    "related relate relating all any everything anything between connections connection connect connected thing things " +
    "ideas notes can could would should please summary summarise summarize explain there been being into onto over"
  ).split(/\s+/),
);

/** Keep an item only if it is reasonably close to the best match and above an absolute floor. */
const MIN_ABSOLUTE_SCORE = 1.2;
const RELATIVE_CUTOFF = 0.3;

export function retrieveSources(
  question: string,
  items: readonly KnowledgeItem[],
  concepts: readonly KnowledgeConcept[],
  topics: readonly TopicCollection[] = [],
  limit = 5,
): RetrievedSource[] {
  const ready = items.filter((item) => item.status === "ready" || item.status === "failed");
  const ranked = searchItems(ready, concepts, question, { extraStopwords: QUESTION_WORDS, topics, limit: limit * 2 });
  const top = ranked[0]?.score ?? 0;
  return ranked
    .filter((result) => result.score >= MIN_ABSOLUTE_SCORE && result.score >= top * RELATIVE_CUTOFF)
    .slice(0, limit)
    .map(({ item, score, snippet }) => ({ item, score, snippet }));
}

function toCitations(sources: RetrievedSource[]): Citation[] {
  return sources.map((source, index) => ({
    n: index + 1,
    itemId: source.item.id,
    title: source.item.title,
    snippet: source.snippet,
    sourceUrl: source.item.sourceUrl,
  }));
}

/** Removes `[n]` markers that do not match a real citation, and drops citations the answer never uses, renumbering the rest. */
export function validateCitations(answer: string, citations: readonly Citation[]): { answer: string; citations: Citation[] } {
  const valid = new Map(citations.map((citation) => [citation.n, citation]));
  const order: number[] = [];
  const cleaned = answer.replace(/\s?\[(\d+)\]/g, (match, raw: string) => {
    const n = Number(raw);
    if (!valid.has(n)) return "";
    if (!order.includes(n)) order.push(n);
    return match;
  });
  const renumber = new Map(order.map((n, index) => [n, index + 1]));
  const renumbered = cleaned.replace(/\[(\d+)\]/g, (_, raw: string) => `[${renumber.get(Number(raw))}]`);
  return {
    answer: renumbered,
    citations: order.map((n) => ({ ...valid.get(n)!, n: renumber.get(n)! })),
  };
}

const PHRASE_FILLER = new Set(
  "a an the is are was were be been to of on in for and or with at by from as that this it its into".split(" "),
);

/** The subject of the question in the user's own words, for the answer's opening line. */
function topicPhrase(question: string): string {
  const words = question
    .replace(/[?!.,]/g, "")
    .split(/\s+/)
    .filter((word) => {
      const key = word.toLowerCase().replace(/['’]s$/, "");
      return word.length > 1 && !QUESTION_WORDS.has(key) && !PHRASE_FILLER.has(key);
    });
  const phrase = words.join(" ").trim();
  return phrase || question.trim().replace(/[?]+$/, "");
}

function conceptNamesFor(sources: RetrievedSource[], concepts: readonly KnowledgeConcept[]): string[] {
  const byId = new Map(concepts.map((concept) => [concept.id, concept.name]));
  const counts = new Map<string, number>();
  for (const { item } of sources) {
    for (const id of item.concepts) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => byId.get(id) ?? id)
    .slice(0, 5);
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function sharedConcepts(sources: RetrievedSource[], concepts: readonly KnowledgeConcept[]) {
  const byId = new Map(concepts.map((concept) => [concept.id, concept.name]));
  const holders = new Map<string, number[]>();
  sources.forEach(({ item }, index) => {
    for (const id of item.concepts) holders.set(id, [...(holders.get(id) ?? []), index + 1]);
  });
  return [...holders.entries()]
    .filter(([, numbers]) => numbers.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([id, numbers]) => ({ name: byId.get(id) ?? id, numbers }));
}

const marker = (numbers: number[]) => numbers.map((n) => `[${n}]`).join("");

/** Deterministic composer: summarises only what the retrieved items say and cites each statement. */
export function composeMockAnswer(
  question: string,
  sources: RetrievedSource[],
  concepts: readonly KnowledgeConcept[],
): string {
  const phrase = topicPhrase(question);
  const names = conceptNamesFor(sources, concepts);
  const lines: string[] = [];
  const count = sources.length;

  const intro = `You have ${count} saved ${count === 1 ? "item" : "items"} on ${phrase}`;
  lines.push(
    `${intro}${names.length ? `, mostly about ${joinNames(names.slice(0, 3))}` : ""} ${marker(sources.map((_, i) => i + 1))}.`.replace(
      /\s+\./,
      ".",
    ),
  );

  lines.push("", "What they say:");
  sources.forEach((source, index) => {
    lines.push(`- ${source.item.title}: ${source.snippet.replace(/\s+/g, " ")} [${index + 1}]`);
  });

  const shared = sharedConcepts(sources, concepts);
  if (shared.length > 0) {
    lines.push("", "How they connect:");
    for (const link of shared) lines.push(`- ${link.name} appears in ${joinNames(link.numbers.map((n) => `[${n}]`))}.`);
  }
  return lines.join("\n");
}

function composeConnectionsAnswer(
  sides: [string, string],
  left: RetrievedSource[],
  right: RetrievedSource[],
  sources: RetrievedSource[],
  concepts: readonly KnowledgeConcept[],
): string {
  const number = (source: RetrievedSource) => sources.findIndex((entry) => entry.item.id === source.item.id) + 1;
  const names = new Map(concepts.map((concept) => [concept.id, concept.name]));
  const leftConcepts = new Set(left.flatMap((source) => source.item.concepts));
  const bridging = uniqueStrings(
    right.flatMap((source) => source.item.concepts.filter((id) => leftConcepts.has(id)).map((id) => names.get(id) ?? id)),
  );

  const lines = [`Connections between ${sides[0]} and ${sides[1]}:`];
  if (bridging.length > 0) {
    const refs = marker([...new Set([...left, ...right].map(number))].sort((a, b) => a - b));
    lines.push(`- Both sides share ${joinNames(bridging.slice(0, 3))} ${refs}.`);
  } else {
    lines.push("- No shared concept was found, but both topics appear in your saved items.");
  }
  lines.push("", `On ${sides[0]}:`);
  for (const source of left.slice(0, 2)) lines.push(`- ${source.item.title}: ${source.snippet} [${number(source)}]`);
  lines.push("", `On ${sides[1]}:`);
  for (const source of right.slice(0, 2)) lines.push(`- ${source.item.title}: ${source.snippet} [${number(source)}]`);
  return lines.join("\n");
}

function followUpsFor(concepts: readonly KnowledgeConcept[], sources: RetrievedSource[]): string[] {
  const names = conceptNamesFor(sources, concepts);
  return names.slice(0, 2).map((name) => `What else have I saved about ${name}?`);
}

function notFound(question: string, deps: AskDeps, now: Date, makeId: IdGenerator): ChatAnswer {
  const popular = [...deps.concepts]
    .sort((a, b) => b.itemIds.length - a.itemIds.length)
    .slice(0, 3)
    .map((concept) => `What did I save about ${concept.name}?`);
  return {
    id: makeId("chat"),
    question,
    answer: `I couldn't find anything in your saved knowledge about "${topicPhrase(question)}". Nothing is cited because there is nothing relevant to cite. Try different words, or save something on this topic first.`,
    citations: [],
    grounded: false,
    relatedConcepts: [],
    followUps: popular,
    provider: "mock",
    createdAt: now.toISOString(),
  };
}

/**
 * Answers a question from the user's own items only. Retrieval first, generation second:
 * the composer sees nothing but the retrieved sources, every `[n]` marker is validated against them,
 * and if nothing relevant is retrieved the answer says so instead of improvising.
 */
export async function askKnowledge(question: string, deps: AskDeps): Promise<ChatAnswer> {
  const now = (deps.now ?? (() => new Date()))();
  const makeId = deps.idGenerator ?? defaultIdGenerator;
  const topics = deps.topics ?? [];
  const limit = deps.maxSources ?? 5;
  const trimmed = question.trim();

  const connections = /connections?\s+between\s+(.+?)\s+and\s+(.+?)[?.!]*$/i.exec(trimmed);
  let sources: RetrievedSource[];
  let sides: { names: [string, string]; left: RetrievedSource[]; right: RetrievedSource[] } | undefined;

  if (connections) {
    const left = retrieveSources(connections[1], deps.items, deps.concepts, topics, 3);
    const right = retrieveSources(connections[2], deps.items, deps.concepts, topics, 3);
    sources = [...left, ...right.filter((entry) => !left.some((other) => other.item.id === entry.item.id))];
    if (left.length > 0 && right.length > 0) sides = { names: [connections[1], connections[2]], left, right };
  } else {
    sources = retrieveSources(trimmed, deps.items, deps.concepts, topics, limit);
  }

  if (!trimmed || sources.length === 0) return notFound(trimmed, deps, now, makeId);

  const mockText = sides
    ? composeConnectionsAnswer(sides.names, sides.left, sides.right, sources, deps.concepts)
    : composeMockAnswer(trimmed, sources, deps.concepts);
  let provider = "mock";
  let text = mockText;

  if (deps.composer) {
    try {
      const generated = await deps.composer.compose(trimmed, toCitations(sources));
      const checked = validateCitations(generated, toCitations(sources));
      // An answer with no valid citation is not grounded; keep the deterministic one instead.
      if (checked.citations.length > 0) {
        text = generated;
        provider = deps.composer.name;
      }
    } catch {
      text = mockText;
    }
  }

  const validated = validateCitations(text, toCitations(sources));
  return {
    id: makeId("chat"),
    question: trimmed,
    answer: validated.answer,
    citations: validated.citations,
    grounded: true,
    relatedConcepts: conceptNamesFor(sources, deps.concepts),
    followUps: followUpsFor(deps.concepts, sources),
    provider,
    createdAt: now.toISOString(),
  };
}
