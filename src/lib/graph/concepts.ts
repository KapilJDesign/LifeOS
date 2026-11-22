import type { KnowledgeConcept, KnowledgeItem } from "../../types/knowledge";
import { findLexiconEntry } from "../ai/lexicon";
import { slugify } from "../ids";
import type { ConceptRef } from "../ai/types";

/** Plural-insensitive lookup key so "AI Agent" and "AI Agents" resolve to the same concept. */
export function conceptKey(name: string): string {
  return slugify(name)
    .split("-")
    .map((token) => (token.length > 3 ? token.replace(/s$/, "") : token))
    .join("-");
}

export interface ConceptIndex {
  byKey: Map<string, KnowledgeConcept>;
  byId: Map<string, KnowledgeConcept>;
}

export function createConceptIndex(concepts: readonly KnowledgeConcept[]): ConceptIndex {
  const byKey = new Map<string, KnowledgeConcept>();
  const byId = new Map<string, KnowledgeConcept>();
  for (const concept of concepts) {
    byId.set(concept.id, concept);
    byKey.set(conceptKey(concept.name), concept);
    for (const alias of concept.aliases) {
      const key = conceptKey(alias);
      if (!byKey.has(key)) byKey.set(key, concept);
    }
  }
  return { byKey, byId };
}

export interface ResolvedConcept {
  concept: KnowledgeConcept;
  isNew: boolean;
}

/**
 * Maps a free-text concept name onto an existing concept (by name or alias) or describes a new one.
 * New concepts take the lexicon's canonical name, aliases and description when the name is known.
 */
export function resolveConcept(index: ConceptIndex, rawName: string): ResolvedConcept {
  const name = rawName.trim();
  const existing = index.byKey.get(conceptKey(name));
  if (existing) return { concept: existing, isNew: false };

  const entry = findLexiconEntry(name);
  const canonical = entry?.name ?? name;
  const known = entry ? index.byKey.get(conceptKey(canonical)) : undefined;
  if (known) return { concept: known, isNew: false };

  return {
    concept: {
      id: slugify(canonical),
      name: canonical,
      description: entry?.description ?? "A concept from your captures.",
      aliases: entry?.aliases ?? [],
      itemIds: [],
    },
    isNew: true,
  };
}

export function toConceptRefs(concepts: readonly KnowledgeConcept[]): ConceptRef[] {
  return concepts.map(({ id, name, aliases }) => ({ id, name, aliases }));
}

/** Recomputes the concept → items inverse index from the items, which are the source of truth. */
export function reconcileConceptItemIds(
  concepts: readonly KnowledgeConcept[],
  items: readonly KnowledgeItem[],
): KnowledgeConcept[] {
  const itemsByConcept = new Map<string, string[]>();
  for (const item of items) {
    for (const conceptId of item.concepts) {
      const list = itemsByConcept.get(conceptId) ?? [];
      list.push(item.id);
      itemsByConcept.set(conceptId, list);
    }
  }
  return concepts.map((concept) => ({ ...concept, itemIds: itemsByConcept.get(concept.id) ?? [] }));
}
