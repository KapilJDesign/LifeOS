import type { KnowledgeConcept, KnowledgeItem, KnowledgeRelationship } from "../../types/knowledge";

export interface RelatedItem {
  item: KnowledgeItem;
  score: number;
  sharedConceptIds: string[];
  /** Human-readable explanation, e.g. "Shares AI Agents and MCP". */
  reason: string;
}

function names(ids: string[], concepts: ReadonlyMap<string, KnowledgeConcept>): string {
  const list = ids.map((id) => concepts.get(id)?.name ?? id);
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/**
 * Items related to `item`, ranked by shared concepts (rarer concepts count more) plus explicit item-to-item relationships.
 */
export function findRelatedItems(
  item: KnowledgeItem,
  items: readonly KnowledgeItem[],
  concepts: readonly KnowledgeConcept[],
  relationships: readonly KnowledgeRelationship[],
  limit = 5,
): RelatedItem[] {
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  const explicit = new Set<string>();
  for (const rel of relationships) {
    if (rel.sourceKind !== "item" || rel.targetKind !== "item") continue;
    if (rel.sourceId === item.id) explicit.add(rel.targetId);
    if (rel.targetId === item.id) explicit.add(rel.sourceId);
  }

  const results: RelatedItem[] = [];
  for (const other of items) {
    if (other.id === item.id || (other.status !== "ready" && !explicit.has(other.id))) continue;
    const shared = item.concepts.filter((id) => other.concepts.includes(id));
    const rarity = shared.reduce((sum, id) => sum + 1 / Math.max(1, conceptById.get(id)?.itemIds.length ?? 1), 0);
    const score = shared.length + rarity + (explicit.has(other.id) ? 1.5 : 0);
    if (shared.length === 0 && !explicit.has(other.id)) continue;
    results.push({
      item: other,
      score: Math.round(score * 100) / 100,
      sharedConceptIds: shared,
      reason: shared.length > 0 ? `Shares ${names(shared.slice(0, 3), conceptById)}` : "Linked in your graph",
    });
  }
  return results
    .sort((a, b) => b.score - a.score || b.item.createdAt.localeCompare(a.item.createdAt))
    .slice(0, limit);
}
