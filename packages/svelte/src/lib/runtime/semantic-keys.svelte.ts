/**
 * Reactive semantic-key service for GGPlot.
 *
 * Owns priorKeys, derived key resolution, candidate key cache, and diagnostics
 * delivery. Pure helpers live in ./semantic-keys.ts and are re-exported here
 * for the historical import path.
 */
import type { CandidateFacts, CellValue, RenderModel } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

import type { InteractionDiagnostic } from "../interaction/interaction.js";
import { rowIndexesForCandidate, uniqueKeysFromRowIndexes } from "../selection/selection.js";
import { resolveSemanticKeysForPlot } from "./semantic-keys.js";

export type SemanticKeyServiceDeps = {
  model: () => RenderModel | null;
  assembled: () => PortableSpec | null;
  datumKey: () =>
    | string
    | number
    | symbol
    | ((row: never, index: number) => PropertyKey)
    | undefined;
  data: () => unknown;
  spec: () => unknown;
  sourceIdentity: (value: unknown) => string;
  deliverDiagnostic: (diagnostic: InteractionDiagnostic) => void;
  /** Owner-only: collect phased effect registration for deterministic ordering. */
  onRegisterEffects?: (attach: () => void) => void;
};

export type SemanticKeyService = {
  semanticKey(row: Record<string, CellValue> | null, index: number | null): PropertyKey | null;
  candidateSemanticKeys(candidate: CandidateFacts): PropertyKey[];
  /** Direct map lookup (inspection coordinator / mask paths). */
  keyAt(index: number): PropertyKey | null;
};

/**
 * Owns priorKeys, semantic key resolution, and diagnostics delivery.
 * Construction may happen as soon as the runtime model exists; call
 * `registerEffects` at the original GGPlot registration site so the
 * diagnostics `$effect` keeps its relative order.
 */
export function createSemanticKeyService(deps: SemanticKeyServiceDeps): SemanticKeyService {
  // Owned for the component lifetime; resolveSemanticKeys mutates in place.
  const priorKeys = new Map<string, PropertyKey>();

  const semanticKeys = $derived.by(() => {
    const model = deps.model();
    return resolveSemanticKeysForPlot({
      model:
        model === null
          ? null
          : {
              candidates: model.candidates,
              lineage: model.lineage,
              row: (rowIndex) => model.row(rowIndex),
            },
      layers: deps.assembled()?.layers ?? [],
      datumKey: deps.datumKey(),
      priorKeys,
      dataToken: deps.sourceIdentity(deps.data()),
      specToken: deps.sourceIdentity(deps.spec()),
    });
  });

  function attachSemanticEffects(): void {
    $effect(() => {
      for (const diagnostic of semanticKeys.diagnostics) deps.deliverDiagnostic(diagnostic);
    });
  }

  deps.onRegisterEffects?.(attachSemanticEffects);

  function semanticKey(
    row: Record<string, CellValue> | null,
    index: number | null,
  ): PropertyKey | null {
    if (row === null || index === null || deps.datumKey() === undefined) return null;
    return semanticKeys.keys.get(index) ?? null;
  }

  /**
   * Shared candidate→semantic-keys cache for the current model/key epoch.
   * Interval, selection anchors, and interaction masks all used to re-walk
   * lineage independently (~3× O(C×L) per reactive turn). Entries fill lazily
   * on first lookup so single-candidate paths (point toggle) stay O(L); full
   * store consumers still share one projection after the first walk. The Map
   * is mutated after the derived produces it — intentional memoization, not
   * reactive state. Fresh bag when model or row keys change.
   */
  const candidateKeysEpoch = $derived.by(() => {
    const model = deps.model();
    // Depend on the row-key bag so key invalidation clears the cache.
    const rowKeys = semanticKeys.keys;
    return {
      model,
      rowKeys,
      cache: new Map<number, PropertyKey[]>(),
    };
  });

  function candidateSemanticKeys(candidate: CandidateFacts): PropertyKey[] {
    const { model, rowKeys, cache } = candidateKeysEpoch;
    if (model === null) return [];
    const hit = cache.get(candidate.id);
    if (hit !== undefined) return hit;
    const rows = rowIndexesForCandidate(candidate, model.lineage.keys(candidate.lineage));
    const keys = uniqueKeysFromRowIndexes(rows, (rowIndex) => rowKeys.get(rowIndex) ?? null);
    cache.set(candidate.id, keys);
    return keys;
  }

  return {
    semanticKey,
    candidateSemanticKeys,
    keyAt(index: number): PropertyKey | null {
      return semanticKeys.keys.get(index) ?? null;
    },
  };
}
