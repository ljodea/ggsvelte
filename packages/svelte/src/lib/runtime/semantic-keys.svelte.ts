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
 * O(R) order fingerprint for plot data — row *references* and length, not
 * deep cell values. In-place reverse bumps the token; in-place cell edits on
 * the same row objects do not (hosts should replace rows/arrays for identity).
 *
 * Avoids the former O(R·F) `JSON.stringify` of every cell on each epoch read.
 */
export function dataContentOrderToken(
  data: unknown,
  sourceIdentity: (value: unknown) => string,
): string {
  if (data === null || data === undefined) return "null";
  if (Array.isArray(data)) {
    let token = `v:${data.length}`;
    for (let index = 0; index < data.length; index++) token += `:${sourceIdentity(data[index])}`;
    return token;
  }
  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    const values = record["values"];
    if (Array.isArray(values)) {
      let token = `v:${values.length}`;
      for (let index = 0; index < values.length; index++)
        token += `:${sourceIdentity(values[index])}`;
      return token;
    }
    const columns = record["columns"];
    if (columns !== null && typeof columns === "object" && !Array.isArray(columns))
      return `c:${sourceIdentity(columns)}`;
    const name = record["name"];
    if (typeof name === "string") {
      const keys = Object.keys(record);
      if (keys.length === 1 && keys[0] === "name") return `n:${name}`;
    }
    return `o:${sourceIdentity(data)}`;
  }
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean")
    return `p:${String(data)}`;
  if (typeof data === "bigint") return `p:${data.toString()}`;
  return `p:${sourceIdentity(data)}`;
}

function datasetsOrderToken(datasets: unknown, sourceIdentity: (value: unknown) => string): string {
  if (datasets === null || datasets === undefined) return "null";
  if (typeof datasets !== "object") return sourceIdentity(datasets);
  const keys = Object.keys(datasets).toSorted();
  let token = `d:${keys.length}`;
  for (const key of keys) {
    token += `|${key}=${dataContentOrderToken(
      (datasets as Record<string, unknown>)[key],
      sourceIdentity,
    )}`;
  }
  return token;
}

/**
 * Stable data/spec identity token for inspection reconcile epochs.
 *
 * Host supplies:
 * - `dataToken` / `specToken` — WeakMap identity of the raw `data` / `spec` props
 * - `data` / `datasets` — content to order-fingerprint (prefer **prop** values,
 *   not a freshly assembled PortableSpec shell, so theme/labs respecs do not
 *   force a re-walk)
 * - `sourceIdentity` — stable object ids for the O(R) order fingerprint
 *
 * Ready=false (no plot yet) → `"no-data"`. Complexity: O(R) over row refs,
 * not O(R·F) deep cell serialization.
 */
export function dataIdentityEpochToken(input: {
  readonly ready: boolean;
  readonly dataToken: string;
  readonly specToken: string;
  readonly data: unknown;
  readonly datasets: unknown;
  readonly sourceIdentity: (value: unknown) => string;
}): string {
  if (!input.ready) return "no-data";
  return `${input.dataToken}:${input.specToken}:${dataContentOrderToken(input.data, input.sourceIdentity)}:${datasetsOrderToken(input.datasets, input.sourceIdentity)}`;
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
    registerEffects,
  };
}
