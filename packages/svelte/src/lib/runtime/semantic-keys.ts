/**
 * Pure semantic-key helpers: source identity, data/spec epoch tokens, and
 * resolveSemanticKeys diagnostics. No runes — the reactive service lives in
 * semantic-keys.svelte.ts.
 */
import type { CellValue } from "@ggsvelte/core";

import type { InteractionDiagnostic } from "../interaction/interaction.js";
import { INTERACTION_DIAGNOSTIC_CATALOG } from "../interaction/interaction.js";

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
    const fieldKeys = Object.keys(record);
    // DataRef shapes only when single-key (matches packages/spec isDataRef).
    // A bare column map may own a field named `values`/`columns` alongside
    // other arrays and must not short-circuit (Codex P2).
    if (fieldKeys.length === 1 && fieldKeys[0] === "values" && Array.isArray(record["values"])) {
      const values = record["values"] as unknown[];
      let token = `v:${values.length}`;
      for (let index = 0; index < values.length; index++)
        token += `:${sourceIdentity(values[index])}`;
      return token;
    }
    if (
      fieldKeys.length === 1 &&
      fieldKeys[0] === "columns" &&
      record["columns"] !== null &&
      typeof record["columns"] === "object" &&
      !Array.isArray(record["columns"])
    )
      return `c:${columnMapOrderToken(record["columns"] as Record<string, unknown>, sourceIdentity)}`;
    if (fieldKeys.length === 1 && fieldKeys[0] === "name" && typeof record["name"] === "string")
      return `n:${record["name"]}`;
    // Bare column-oriented object (gg() wraps as { columns }) — fingerprint
    // each field's array identity so in-place column replacement bumps epoch.
    if (fieldKeys.length > 0 && fieldKeys.every((key) => Array.isArray(record[key])))
      return `c:${columnMapOrderToken(record, sourceIdentity)}`;
    return `o:${sourceIdentity(data)}`;
  }
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean")
    return `p:${String(data)}`;
  if (typeof data === "bigint") return `p:${data.toString()}`;
  return `p:${sourceIdentity(data)}`;
}

/** O(fields) fingerprint: each column array's identity (+ length), not cells. */
function columnMapOrderToken(
  columns: Record<string, unknown>,
  sourceIdentity: (value: unknown) => string,
): string {
  const keys = Object.keys(columns).toSorted();
  let token = `${keys.length}`;
  for (const key of keys) {
    const column = columns[key];
    token += `|${key}=${sourceIdentity(column)}`;
    if (Array.isArray(column)) token += `@${column.length}`;
  }
  return token;
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
 * O(layers) fingerprint of geom-child / layer-local data props.
 * Missing `layers` → `"null"` so legacy callers keep a stable suffix.
 */
export function layersDataOrderToken(
  layers: readonly { readonly data?: unknown }[] | undefined,
  sourceIdentity: (value: unknown) => string,
): string {
  if (layers === undefined) return "null";
  let token = `L:${layers.length}`;
  for (let index = 0; index < layers.length; index++) {
    token += `|${index}=${dataContentOrderToken(layers[index]?.data, sourceIdentity)}`;
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
 * - `layers` — optional geom-child descriptors whose `data` must also bump the
 *   epoch when plot-level data/spec are absent (#609)
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
  readonly layers?: readonly { readonly data?: unknown }[];
  readonly sourceIdentity: (value: unknown) => string;
}): string {
  if (!input.ready) return "no-data";
  return `${input.dataToken}:${input.specToken}:${dataContentOrderToken(input.data, input.sourceIdentity)}:${datasetsOrderToken(input.datasets, input.sourceIdentity)}:${layersDataOrderToken(input.layers, input.sourceIdentity)}`;
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
