import type { CellValue } from "@ggsvelte/core";

import { INTERACTION_DIAGNOSTIC_CATALOG, type InteractionDiagnostic } from "./interaction.js";

/**
 * Source-identity tracker owned by one GGPlot instance for the component
 * lifetime. Do not clear: clearing would silently reset dataIdentityEpoch and
 * break unstable-key detection across respecs.
 */
export type SourceIdentityTracker = {
  sourceIdentity(value: unknown): string;
};

export function createSourceIdentityTracker(): SourceIdentityTracker {
  const sourceIdentities = new WeakMap<object, number>();
  let nextSourceIdentity = 1;
  return {
    sourceIdentity(value: unknown): string {
      if ((typeof value !== "object" && typeof value !== "function") || value === null)
        return String(value);
      let identity = sourceIdentities.get(value);
      if (identity === undefined) {
        identity = nextSourceIdentity++;
        sourceIdentities.set(value, identity);
      }
      return String(identity);
    },
  };
}

export type SemanticKeyCandidate = {
  readonly id: number;
  readonly rowIndex: number | null;
  readonly layerIndex: number;
  readonly lineage: number;
};

type SemanticKeyLayer = {
  readonly geom: string;
  readonly params?: Record<string, unknown> | undefined;
};

/** Narrow model surface needed for key resolution (no RenderModel import). */
export type SemanticKeyModelView = {
  readonly candidateCount: number;
  candidate(id: number): SemanticKeyCandidate | null;
  lineageKeys(lineageId: number): Iterable<number>;
  row(rowIndex: number): Record<string, CellValue> | null;
  readonly layers: readonly SemanticKeyLayer[];
};

export type ResolveSemanticKeysInput = {
  readonly model: SemanticKeyModelView;
  readonly datumKey:
    | string
    | number
    | symbol
    | ((row: never, index: number) => PropertyKey)
    | undefined;
  /**
   * Mutable per-component map of rowIdentity → last key. Caller owns lifetime;
   * this function mutates it in place (same as GGPlot historically).
   */
  readonly priorKeys: Map<string, PropertyKey>;
  /** Stable identity for a source row within the current data/spec epoch. */
  readonly rowIdentity: (rowIndex: number) => string;
};

export type ResolveSemanticKeysResult = {
  readonly keys: Map<number, PropertyKey | null>;
  readonly diagnostics: InteractionDiagnostic[];
};

/**
 * Resolve durable semantic keys for interaction, emitting diagnostics in
 * encounter order: synthetic-rule missing lineage, per-candidate missing
 * lineage, then per-row invalid / unstable / duplicate key diagnostics.
 */
export function resolveSemanticKeys(input: ResolveSemanticKeysInput): ResolveSemanticKeysResult {
  const keys = new Map<number, PropertyKey | null>();
  const diagnostics: InteractionDiagnostic[] = [];
  const { model, datumKey, priorKeys, rowIdentity } = input;
  if (datumKey === undefined) return { keys, diagnostics };

  const owners = new Map<PropertyKey, number>();
  const sourceRows = new Set<number>();
  if (
    model.candidateCount === 0 &&
    model.layers.some(
      (layer) =>
        layer.geom === "rule" &&
        (layer.params?.["xintercept"] !== undefined || layer.params?.["yintercept"] !== undefined),
    )
  )
    diagnostics.push({
      ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_MISSING_LINEAGE,
      actual: "synthetic rule has no source rows",
    });

  for (let id = 0; id < model.candidateCount; id++) {
    const candidate = model.candidate(id);
    if (candidate === null) continue;
    if (candidate.rowIndex !== null) sourceRows.add(candidate.rowIndex);
    const lineageRows = [...model.lineageKeys(candidate.lineage)];
    if (candidate.rowIndex === null && lineageRows.length === 0)
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_MISSING_LINEAGE,
        actual: {
          layerIndex: candidate.layerIndex,
          candidateId: candidate.id,
        },
      });
    for (const rowIndex of lineageRows) sourceRows.add(rowIndex);
  }

  for (const rowIndex of sourceRows) {
    const row = model.row(rowIndex);
    const value =
      row === null
        ? null
        : typeof datumKey === "function"
          ? (datumKey as (row: Record<string, CellValue>, index: number) => PropertyKey)(
              row,
              rowIndex,
            )
          : row[datumKey as string];
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "symbol") {
      keys.set(rowIndex, null);
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INVALID_KEY,
        actual: value,
      });
      continue;
    }
    if (row !== null) {
      const identity = rowIdentity(rowIndex);
      const priorKey = priorKeys.get(identity);
      if (priorKey !== undefined && priorKey !== value) {
        keys.set(rowIndex, null);
        diagnostics.push({
          ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_UNSTABLE_KEY,
          actual: { previous: priorKey, current: value },
        });
        continue;
      }
      priorKeys.set(identity, value);
    }
    const prior = owners.get(value);
    if (prior !== undefined && prior !== rowIndex) {
      keys.set(prior, null);
      keys.set(rowIndex, null);
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_DUPLICATE_KEY,
        actual: value,
      });
    } else {
      owners.set(value, rowIndex);
      keys.set(rowIndex, value);
    }
  }
  return { keys, diagnostics };
}
