/**
 * Semantic-key resolution for GGPlot: pure helpers (source identity, key
 * resolution, diagnostics) plus the reactive service that owns priorKeys and
 * diagnostics delivery.
 *
 * Pure refactor host: fold-in of plot-semantic-keys + createSemanticKeyService
 * from plot-shared-services. Entry→key index for discrete scale groups lives
 * under the feature module that owns that surface (S16 ownership).
 */
import type { CandidateFacts, CellValue, RenderModel } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

import type { InteractionDiagnostic } from "../interaction/interaction.js";
import { INTERACTION_DIAGNOSTIC_CATALOG } from "../interaction/interaction.js";
import { rowIndexesForCandidate, uniqueKeysFromRowIndexes } from "../selection/selection.js";

// ---------------------------------------------------------------------------
// Pure helpers (from plot-semantic-keys.ts)
// ---------------------------------------------------------------------------

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
 * Stable data/spec identity token for inspection reconcile epochs.
 * Host supplies sourceIdentity tokens for the raw `data` / `spec` props.
 */
export function dataIdentityEpochToken(input: {
  readonly assembled: { readonly data?: unknown; readonly datasets?: unknown } | null;
  readonly dataToken: string;
  readonly specToken: string;
}): string {
  if (input.assembled === null) return "no-data";
  return `${input.dataToken}:${input.specToken}:${JSON.stringify([
    input.assembled.data ?? null,
    input.assembled.datasets ?? null,
  ])}`;
}

/** Empty semantic-key bag when there is no render model. */
function emptySemanticKeysResult(): ResolveSemanticKeysResult {
  return {
    keys: new Map<number, PropertyKey | null>(),
    diagnostics: [],
  };
}

export type SemanticKeysPlotModel = {
  readonly candidates: {
    readonly size: number;
    candidate(id: number): SemanticKeyCandidate | null;
  };
  readonly lineage: { keys(lineageId: number): Iterable<number> };
  row(rowIndex: number): Record<string, CellValue> | null;
};

/**
 * Resolve semantic keys for a GGPlot host: null model → empty bag; else adapt
 * the render model into `SemanticKeyModelView` and call `resolveSemanticKeys`.
 */
export function resolveSemanticKeysForPlot(input: {
  readonly model: SemanticKeysPlotModel | null;
  readonly layers: readonly SemanticKeyLayer[];
  readonly datumKey: ResolveSemanticKeysInput["datumKey"];
  readonly priorKeys: Map<string, PropertyKey>;
  readonly dataToken: string;
  readonly specToken: string;
}): ResolveSemanticKeysResult {
  if (input.model === null) return emptySemanticKeysResult();
  const model = input.model;
  return resolveSemanticKeys({
    model: {
      candidateCount: model.candidates.size,
      candidate: (id) => model.candidates.candidate(id),
      lineageKeys: (lineageId) => model.lineage.keys(lineageId),
      row: (rowIndex) => model.row(rowIndex),
      layers: input.layers,
    },
    datumKey: input.datumKey,
    priorKeys: input.priorKeys,
    rowIdentity: (rowIndex) => `${input.dataToken}:${input.specToken}:${rowIndex}`,
  });
}

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

// ---------------------------------------------------------------------------
// Reactive service (from plot-shared-services.svelte.ts)
// ---------------------------------------------------------------------------

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
};

export type SemanticKeyService = {
  semanticKey(row: Record<string, CellValue> | null, index: number | null): PropertyKey | null;
  candidateSemanticKeys(candidate: CandidateFacts): PropertyKey[];
  /** Direct map lookup (inspection coordinator / mask paths). */
  keyAt(index: number): PropertyKey | null;
  /** Register diagnostics delivery at the host's original effect position. */
  registerEffects(): void;
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

  function registerEffects(): void {
    $effect(() => {
      for (const diagnostic of semanticKeys.diagnostics) deps.deliverDiagnostic(diagnostic);
    });
  }

  function semanticKey(
    row: Record<string, CellValue> | null,
    index: number | null,
  ): PropertyKey | null {
    if (row === null || index === null || deps.datumKey() === undefined) return null;
    return semanticKeys.keys.get(index) ?? null;
  }

  function candidateSemanticKeys(candidate: CandidateFacts): PropertyKey[] {
    const model = deps.model();
    if (model === null) return [];
    const rows = rowIndexesForCandidate(candidate, model.lineage.keys(candidate.lineage));
    return uniqueKeysFromRowIndexes(rows, (rowIndex) => semanticKey(model.row(rowIndex), rowIndex));
  }

  return {
    semanticKey,
    candidateSemanticKeys,
    keyAt(index: number): PropertyKey | null {
      return semanticKeys.keys.get(index) ?? null;
    },
    registerEffects,
  };
}
