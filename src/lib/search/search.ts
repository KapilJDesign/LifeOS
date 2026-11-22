import type {
  ContentKind,
  ItemStatus,
  KnowledgeConcept,
  KnowledgeItem,
  SourceType,
  TopicCollection,
} from "../../types/knowledge";

export type SearchField = "title" | "tags" | "concepts" | "summary" | "takeaways" | "content" | "source";
export type SortMode = "relevance" | "recent" | "oldest" | "title" | "topic";

export interface SearchFilters {
  sourceTypes?: SourceType[];
  contentKinds?: ContentKind[];
  tags?: string[];
  conceptIds?: string[];
  topicId?: string;
  favoritesOnly?: boolean;
  status?: ItemStatus[];
  createdAfter?: string;
  createdBefore?: string;
}

export interface SearchOptions {
  filters?: SearchFilters;
  /** Defaults to "relevance" for a query and "recent" for an empty one. */
  sort?: SortMode;
  limit?: number;
  topics?: readonly TopicCollection[];
  /** Words to ignore in addition to the built-in stopwords (the chat module adds question words). */
  extraStopwords?: ReadonlySet<string>;
}

export interface SearchResult {
  item: KnowledgeItem;
  score: number;
  matchedFields: SearchField[];
  matchedTerms: string[];
  snippet: string;
}

const FIELD_WEIGHTS: Record<SearchField, number> = {
  title: 3,
  tags: 2.5,
  concepts: 2.5,
  source: 1.5,
  summary: 1.5,
  takeaways: 1,
  content: 1,
};

const STOPWORDS = new Set(
  (
    "a an and are as at be but by for from has have he her his i in is it its of on or she so that the their them they " +
    "this to was we were what when which who will with you your"
  ).split(/\s+/),
);

const K1 = 1.2;
const B = 0.75;

/** Light suffix stemming so "agents" matches "agent" and "building" matches "build". */
export function stem(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("ing") && token.length > 5) return token.slice(0, -3);
  if (token.endsWith("ed") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function tokenize(text: string, extraStopwords?: ReadonlySet<string>): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0 && !STOPWORDS.has(token) && !extraStopwords?.has(token))
    .map(stem);
}

interface IndexedField {
  tokens: string[];
  counts: Map<string, number>;
}

interface IndexedDoc {
  item: KnowledgeItem;
  fields: Record<SearchField, IndexedField>;
}

function indexField(text: string): IndexedField {
  const tokens = tokenize(text);
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return { tokens, counts };
}

function conceptNames(item: KnowledgeItem, concepts: readonly KnowledgeConcept[]): string {
  const byId = new Map(concepts.map((concept) => [concept.id, concept]));
  return item.concepts
    .map((id) => {
      const concept = byId.get(id);
      return concept ? [concept.name, ...concept.aliases].join(" ") : id.replace(/-/g, " ");
    })
    .join(" ");
}

function indexItem(item: KnowledgeItem, concepts: readonly KnowledgeConcept[]): IndexedDoc {
  return {
    item,
    fields: {
      title: indexField(item.title),
      tags: indexField(item.tags.join(" ")),
      concepts: indexField(conceptNames(item, concepts)),
      source: indexField(`${item.sourceName ?? ""} ${item.platform} ${item.sourceType}`),
      summary: indexField(item.summary),
      takeaways: indexField(item.keyTakeaways.join(" ")),
      content: indexField(item.content),
    },
  };
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildSnippet(item: KnowledgeItem, terms: Set<string>): string {
  const candidates = [item.summary, ...item.keyTakeaways, ...splitSentences(item.content)].filter(Boolean);
  let best = candidates[0] ?? "";
  let bestScore = -1;
  for (const candidate of candidates) {
    const hits = new Set(tokenize(candidate).filter((token) => terms.has(token)));
    if (hits.size > bestScore) {
      best = candidate;
      bestScore = hits.size;
    }
  }
  return best.length > 200 ? `${best.slice(0, 197).trimEnd()}…` : best;
}

export function applyFilters(
  items: readonly KnowledgeItem[],
  filters: SearchFilters | undefined,
  topics: readonly TopicCollection[] = [],
): KnowledgeItem[] {
  if (!filters) return [...items];
  const topic = filters.topicId ? topics.find((entry) => entry.id === filters.topicId) : undefined;
  const topicConcepts = topic ? new Set(topic.conceptIds) : undefined;
  const wantedTags = filters.tags?.map((tag) => tag.toLowerCase());

  return items.filter((item) => {
    if (filters.sourceTypes?.length && !filters.sourceTypes.includes(item.sourceType)) return false;
    if (filters.contentKinds?.length && !filters.contentKinds.includes(item.contentKind)) return false;
    if (filters.status?.length && !filters.status.includes(item.status)) return false;
    if (filters.favoritesOnly && !item.isFavorite) return false;
    if (wantedTags?.length && !wantedTags.every((tag) => item.tags.some((own) => own.toLowerCase() === tag))) return false;
    if (filters.conceptIds?.length && !filters.conceptIds.some((id) => item.concepts.includes(id))) return false;
    if (filters.topicId && (!topicConcepts || !item.concepts.some((id) => topicConcepts.has(id)))) return false;
    if (filters.createdAfter && item.createdAt < filters.createdAfter) return false;
    if (filters.createdBefore && item.createdAt > filters.createdBefore) return false;
    return true;
  });
}

interface QueryTerm {
  tokens: string[];
  weight: number;
  /** Words the user typed. Expansion terms from concept aliases are not primary. */
  primary: boolean;
}

function buildQueryTerms(
  query: string,
  concepts: readonly KnowledgeConcept[],
  extraStopwords?: ReadonlySet<string>,
): QueryTerm[] {
  const primaryTokens = [...new Set(tokenize(query, extraStopwords))];
  const terms: QueryTerm[] = primaryTokens.map((token) => ({ tokens: [token], weight: 1, primary: true }));
  const seen = new Set(primaryTokens);

  // A query that names a concept or one of its aliases also searches the concept's other names.
  // Each name is a phrase: all of its words must appear in the same field, so "agents" does not pull in everything about "AI".
  const normalizedQuery = ` ${tokenize(query).join(" ")} `;
  for (const concept of concepts) {
    const names = [concept.name, ...concept.aliases];
    const hit = names.some((name) => {
      const phrase = tokenize(name).join(" ");
      return phrase.length > 0 && normalizedQuery.includes(` ${phrase} `);
    });
    if (!hit) continue;
    for (const name of names) {
      const tokens = tokenize(name);
      const key = tokens.join(" ");
      if (tokens.length === 0 || seen.has(key)) continue;
      seen.add(key);
      terms.push({ tokens, weight: 0.6, primary: false });
    }
  }
  return terms;
}

function termFrequency(field: IndexedField, term: QueryTerm, prefix?: string): number {
  if (term.tokens.length > 1) return Math.min(...term.tokens.map((token) => field.counts.get(token) ?? 0));
  const [token] = term.tokens;
  const exact = field.counts.get(token) ?? 0;
  if (exact > 0 || !prefix || token !== prefix) return exact;
  // Typing in progress: a prefix hit counts at half weight when the exact word is absent.
  let partial = 0;
  for (const [candidate, count] of field.counts) if (candidate.startsWith(prefix)) partial += count * 0.5;
  return partial;
}

function topicName(item: KnowledgeItem, topics: readonly TopicCollection[]): string {
  const topic = topics.find((entry) => entry.conceptIds.some((id) => item.concepts.includes(id)));
  return topic?.name ?? "~";
}

/**
 * Local BM25-style ranking over title, tags, concepts, source, summary, takeaways and content.
 * Field weights favour curated fields; concept aliases expand the query as phrases; the last query word
 * also matches as a prefix so results update while typing.
 */
export function searchItems(
  items: readonly KnowledgeItem[],
  concepts: readonly KnowledgeConcept[],
  query: string,
  options: SearchOptions = {},
): SearchResult[] {
  const topics = options.topics ?? [];
  const candidates = applyFilters(items, options.filters, topics);
  const trimmed = query.trim();
  const limit = options.limit ?? Number.POSITIVE_INFINITY;

  if (!trimmed) {
    const sort = options.sort && options.sort !== "relevance" ? options.sort : "recent";
    return sortResults(
      candidates.map((item) => ({ item, score: 0, matchedFields: [], matchedTerms: [], snippet: item.summary })),
      sort,
      topics,
    ).slice(0, limit);
  }

  const terms = buildQueryTerms(trimmed, concepts, options.extraStopwords);
  if (terms.length === 0) return [];
  const lastRaw = trimmed.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).pop() ?? "";
  const prefix = lastRaw.length >= 3 && !/\s$/.test(query) ? stem(lastRaw) : undefined;

  const docs = candidates.map((item) => indexItem(item, concepts));
  const fieldNames = Object.keys(FIELD_WEIGHTS) as SearchField[];
  const avgLength = Object.fromEntries(
    fieldNames.map((field) => [
      field,
      Math.max(1, docs.reduce((sum, doc) => sum + doc.fields[field].tokens.length, 0) / Math.max(1, docs.length)),
    ]),
  ) as Record<SearchField, number>;

  const docFrequency = terms.map(
    (term) => docs.filter((doc) => fieldNames.some((field) => termFrequency(doc.fields[field], term) > 0)).length,
  );

  const results: SearchResult[] = [];
  for (const doc of docs) {
    let score = 0;
    const matchedFields = new Set<SearchField>();
    const matchedTokens = new Set<string>();
    const matchedPrimary = new Set<number>();

    terms.forEach((term, termIndex) => {
      const n = docFrequency[termIndex];
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      for (const field of fieldNames) {
        const data = doc.fields[field];
        const tf = termFrequency(data, term, prefix);
        if (tf === 0) continue;
        const norm = tf + K1 * (1 - B + B * (data.tokens.length / avgLength[field]));
        score += idf * term.weight * FIELD_WEIGHTS[field] * ((tf * (K1 + 1)) / norm);
        matchedFields.add(field);
        term.tokens.forEach((token) => matchedTokens.add(token));
        if (term.primary) matchedPrimary.add(termIndex);
      }
    });

    if (matchedFields.size === 0) continue;
    const primaryCount = terms.filter((term) => term.primary).length;
    const coverage = primaryCount === 0 ? 1 : matchedPrimary.size / primaryCount;
    score *= 0.5 + 0.5 * coverage;
    if (doc.item.isFavorite) score *= 1.05;

    results.push({
      item: doc.item,
      score: Math.round(score * 1000) / 1000,
      matchedFields: [...matchedFields],
      matchedTerms: [...matchedTokens],
      snippet: buildSnippet(doc.item, matchedTokens),
    });
  }

  return sortResults(results, options.sort ?? "relevance", topics).slice(0, limit);
}

function sortResults(results: SearchResult[], sort: SortMode, topics: readonly TopicCollection[]): SearchResult[] {
  const sorted = [...results];
  switch (sort) {
    case "recent":
      return sorted.sort((a, b) => b.item.createdAt.localeCompare(a.item.createdAt));
    case "oldest":
      return sorted.sort((a, b) => a.item.createdAt.localeCompare(b.item.createdAt));
    case "title":
      return sorted.sort((a, b) => a.item.title.localeCompare(b.item.title));
    case "topic":
      return sorted.sort(
        (a, b) =>
          topicName(a.item, topics).localeCompare(topicName(b.item, topics)) ||
          b.item.createdAt.localeCompare(a.item.createdAt),
      );
    default:
      return sorted.sort((a, b) => b.score - a.score || b.item.createdAt.localeCompare(a.item.createdAt));
  }
}

/** Type-ahead suggestions drawn from tags, concept names and titles. */
export function suggestQueries(
  items: readonly KnowledgeItem[],
  concepts: readonly KnowledgeConcept[],
  prefix: string,
  limit = 6,
): string[] {
  const needle = prefix.trim().toLowerCase();
  if (needle.length < 2) return [];
  const pool = [
    ...concepts.map((concept) => concept.name),
    ...items.flatMap((item) => item.tags),
    ...items.map((item) => item.title),
  ];
  const seen = new Set<string>();
  const startsWith: string[] = [];
  const contains: string[] = [];
  for (const candidate of pool) {
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (key.startsWith(needle)) startsWith.push(candidate);
    else if (key.includes(needle)) contains.push(candidate);
  }
  return [...startsWith, ...contains].slice(0, limit);
}
