/**
 * Pure legend-focus helpers for GGPlot.
 *
 * Hosts own local/controller emphasis state, DOM handlers, announcements,
 * and event emission. This module owns identity keying, entry listing,
 * semantic key indexing, pressed-state resolution, and roving-index math.
 */
import type { CellValue, SceneLegend, SceneLegendEntry } from "@ggsvelte/core";
import { legendValueEqual } from "@ggsvelte/core";

import type { InteractionSource } from "./interaction.js";
import { iterateCandidates, type CandidateLookup } from "./plot-selection.js";

/** Stable renderer identity for one entry in one discrete legend. */
export interface LegendEntryIdentity {
  scale: string;
  entryIndex: number;
}

export type LegendInteractionSource = "pointer" | "touch" | "focus" | "keyboard";

export interface LegendEntryAction {
  identity: LegendEntryIdentity;
  entry: SceneLegendEntry;
  source: LegendInteractionSource;
}

/** One discrete legend entry flattened for hit targets / roving focus. */
export interface InteractiveLegendEntry {
  readonly legend: Extract<SceneLegend, { type: "discrete" }>;
  readonly entry: SceneLegendEntry;
  readonly identity: LegendEntryIdentity;
}

type LegendMappedField = {
  readonly channel: string;
  readonly field: string;
  readonly source?: "stat";
};

type LegendKeyCandidate = {
  readonly layerIndex: number;
  readonly lineage: number;
  readonly rowIndex: number | null;
};

/**
 * Narrow adapter for buildLegendEntryKeyIndex.
 * Hosts map RenderModel + semantic keys into this surface.
 */
export type LegendKeyIndexAdapter = {
  readonly legends: readonly SceneLegend[];
  /** Candidates in id-ascending order (null candidates already filtered). */
  candidates(): Iterable<LegendKeyCandidate>;
  layerFields(layerIndex: number): readonly LegendMappedField[] | undefined;
  /**
   * Scaled constant for a layer channel (`aes: { color: { value, scale: true } }`).
   * When present and no field mapping exists, every row of the layer matches
   * the legend entry equal to this value.
   */
  layerScaledConstant?(layerIndex: number, channel: string): unknown;
  lineageKeys(lineageId: number): Iterable<number>;
  row(rowIndex: number): Record<string, CellValue> | null;
  /** Semantic key for a source row; null/undefined rows are skipped. */
  semanticKey(rowIndex: number): PropertyKey | null | undefined;
};

/** Map identity to the stable index key used by the entry-key map. */
export function legendIdentityKey(identity: LegendEntryIdentity): string {
  return `${identity.scale}:${String(identity.entryIndex)}`;
}

/**
 * Flatten discrete scene legends into interactive targets.
 * Ramp legends are excluded. Order is legend order, then entryIndex order.
 */
export function buildInteractiveLegendEntries(
  legends: readonly SceneLegend[],
): InteractiveLegendEntry[] {
  return legends.flatMap((sceneLegend) =>
    sceneLegend.type === "discrete"
      ? sceneLegend.entries.map((entry, entryIndex) => ({
          legend: sceneLegend,
          entry,
          identity: { scale: sceneLegend.scale, entryIndex },
        }))
      : [],
  );
}

/**
 * Set equality for PropertyKey collections (order-insensitive, duplicate-tolerant).
 * Distinct Symbols never equal even when descriptions match.
 */
export function samePropertyKeySet(
  left: readonly PropertyKey[],
  right: readonly PropertyKey[],
): boolean {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (leftSet.size !== rightSet.size) return false;
  for (const key of leftSet) if (!rightSet.has(key)) return false;
  return true;
}

/** Map a legend interaction source to the public InteractionSource surface. */
export function legendInteractionSource(source: LegendInteractionSource): InteractionSource {
  if (source === "pointer" || source === "touch") return source;
  return "keyboard";
}

/** Look up frozen semantic keys for a legend entry identity. */
export function keysForLegendEntry(
  index: ReadonlyMap<string, readonly PropertyKey[]>,
  identity: LegendEntryIdentity,
): readonly PropertyKey[] {
  return index.get(legendIdentityKey(identity)) ?? [];
}

/**
 * Clamp a roving tabindex index into [0, count).
 * Empty lists return 0 so hosts can store a stable default.
 */
export function clampLegendRovingIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  if (!Number.isFinite(current)) return 0;
  return Math.min(Math.max(0, Math.trunc(current)), count - 1);
}

/**
 * Non-wrapping roving navigation for Arrow/Home/End.
 * Unknown keys return the clamped current index. Empty lists return 0.
 */
export function moveLegendRovingIndex(current: number, key: string, count: number): number {
  if (count <= 0) return 0;
  const last = count - 1;
  const index = clampLegendRovingIndex(current, count);
  if (key === "ArrowRight" || key === "ArrowDown") return Math.min(last, index + 1);
  if (key === "ArrowLeft" || key === "ArrowUp") return Math.max(0, index - 1);
  if (key === "Home") return 0;
  if (key === "End") return last;
  return index;
}

export type FindLegendPressedIdentityInput = {
  readonly keys: readonly PropertyKey[];
  readonly entries: readonly InteractiveLegendEntry[];
  readonly keyIndex: ReadonlyMap<string, readonly PropertyKey[]>;
  readonly committed: {
    readonly identity: LegendEntryIdentity;
    readonly keys: readonly PropertyKey[];
  } | null;
};

/**
 * Resolve which legend entry should appear pressed.
 * Committed identity wins when its key set still matches (even if multiple
 * entries share the same keys). Otherwise require exactly one matching entry.
 */
export function findLegendPressedIdentity(
  input: FindLegendPressedIdentityInput,
): LegendEntryIdentity | null {
  if (input.keys.length === 0) return null;
  if (input.committed !== null && samePropertyKeySet(input.committed.keys, input.keys))
    return input.committed.identity;
  const matches: LegendEntryIdentity[] = [];
  for (const entry of input.entries) {
    const entryKeys = keysForLegendEntry(input.keyIndex, entry.identity);
    if (samePropertyKeySet(entryKeys, input.keys)) matches.push(entry.identity);
  }
  return matches.length === 1 ? matches[0]! : null;
}

/**
 * Build the discrete legend entry → semantic key index.
 *
 * Contract (characterizes GGPlot host behavior):
 * - Pre-seed empty buckets for every discrete entry (unmatched stay []).
 * - Skip ramp legends and null candidates.
 * - Map only non-stat fields whose channel equals the legend scale.
 * - When no field mapping exists, fall back to layerScaledConstant for that
 *   channel (scaled constant aes) and match the constant against entries.
 * - Row membership = lineage row indexes (insertion order) then candidate
 *   rowIndex if not already present.
 * - Visit key is scale:layerIndex:field|const:rowIndex (dedupe repeated candidates).
 * - Skip null rows (field path) / null keys; constant path only needs keys.
 * - Match entry values with legendValueEqual (NaN, Date, -0/0).
 * - Final keys are first-seen unique order, frozen.
 */
/** Row field value or scaled constant; `skip` when the row is missing. */
function resolveLegendMatchValue(
  adapter: LegendKeyIndexAdapter,
  field: string | undefined,
  scaledConstant: unknown,
  rowIndex: number,
): { readonly skip: true } | { readonly skip: false; readonly value: unknown } {
  if (field === undefined) return { skip: false, value: scaledConstant };
  const row = adapter.row(rowIndex);
  if (row === null) return { skip: true };
  return { skip: false, value: row[field] };
}

/**
 * GGPlot host surface for legend entry key indexing (null model → empty map).
 * Candidate walk is id-ascending via `iterateCandidates` (first-seen key order).
 */
export type LegendKeyIndexPlotModel = {
  readonly scene: { readonly legends: readonly SceneLegend[] };
  readonly candidates: CandidateLookup<{
    readonly layerIndex: number;
    readonly lineage: number;
    readonly rowIndex: number | null;
  }>;
  readonly layerFields: ReadonlyArray<
    | ReadonlyArray<{
        readonly channel: string;
        readonly field: string;
        readonly source?: "stat";
      }>
    | undefined
  >;
  readonly layerScaledConstants: ReadonlyArray<Readonly<Record<string, unknown>> | undefined>;
  readonly lineage: { keys(lineageId: number): Iterable<number> };
  row(rowIndex: number): Record<string, CellValue> | null;
};

/**
 * Build the legend entry → semantic keys index for a plot model.
 * Host keeps `semanticKey` as a callback so `$derived` tracks key map updates.
 */
export function buildLegendEntryKeyIndexForPlot(input: {
  readonly model: LegendKeyIndexPlotModel | null;
  readonly semanticKey: (rowIndex: number) => PropertyKey | null | undefined;
}): ReadonlyMap<string, readonly PropertyKey[]> {
  if (input.model === null) return new Map();
  const model = input.model;
  return buildLegendEntryKeyIndex({
    legends: model.scene.legends,
    candidates: function* () {
      for (const candidate of iterateCandidates(model.candidates)) {
        yield {
          layerIndex: candidate.layerIndex,
          lineage: candidate.lineage,
          rowIndex: candidate.rowIndex,
        };
      }
    },
    layerFields: (layerIndex) => model.layerFields[layerIndex],
    layerScaledConstant: (layerIndex, channel) => model.layerScaledConstants[layerIndex]?.[channel],
    lineageKeys: (lineageId) => model.lineage.keys(lineageId),
    row: (rowIndex) => model.row(rowIndex),
    semanticKey: input.semanticKey,
  });
}

export function buildLegendEntryKeyIndex(
  adapter: LegendKeyIndexAdapter,
): ReadonlyMap<string, readonly PropertyKey[]> {
  const index = new Map<string, PropertyKey[]>();
  for (const sceneLegend of adapter.legends) {
    if (sceneLegend.type !== "discrete") continue;
    for (let entryIndex = 0; entryIndex < sceneLegend.entries.length; entryIndex++)
      index.set(legendIdentityKey({ scale: sceneLegend.scale, entryIndex }), []);
  }
  const visited = new Set<string>();
  for (const candidate of adapter.candidates()) {
    for (const sceneLegend of adapter.legends) {
      if (sceneLegend.type !== "discrete") continue;
      const field = adapter
        .layerFields(candidate.layerIndex)
        ?.find((mapped) => mapped.channel === sceneLegend.scale && mapped.source !== "stat")?.field;
      const scaledConstant =
        field === undefined
          ? adapter.layerScaledConstant?.(candidate.layerIndex, sceneLegend.scale)
          : undefined;
      if (field === undefined && scaledConstant === undefined) continue;
      const sourceRows = new Set(adapter.lineageKeys(candidate.lineage));
      if (candidate.rowIndex !== null) sourceRows.add(candidate.rowIndex);
      for (const rowIndex of sourceRows) {
        const visitField = field ?? `const:${String(scaledConstant)}`;
        const visit = `${sceneLegend.scale}:${String(candidate.layerIndex)}:${visitField}:${String(rowIndex)}`;
        if (visited.has(visit)) continue;
        visited.add(visit);
        const key = adapter.semanticKey(rowIndex);
        if (key === null || key === undefined) continue;
        const matched = resolveLegendMatchValue(adapter, field, scaledConstant, rowIndex);
        if (matched.skip) continue;
        const entryIndex = sceneLegend.entries.findIndex((entry) =>
          legendValueEqual(entry.value, matched.value),
        );
        if (entryIndex < 0) continue;
        index.get(legendIdentityKey({ scale: sceneLegend.scale, entryIndex }))?.push(key);
      }
    }
  }
  return new Map(
    [...index].map(([identity, keys]) => [identity, Object.freeze([...new Set(keys)])]),
  );
}

/**
 * Decide what a legend preview attempt should do with resolved keys.
 * Empty key sets clear any active preview (empty domain entry / stale target)
 * rather than leaving the previous entry highlighted.
 */
export function resolveLegendPreviewKeysDecision(
  keys: readonly PropertyKey[],
): { readonly type: "set"; readonly keys: readonly PropertyKey[] } | { readonly type: "clear" } {
  return keys.length === 0 ? { type: "clear" } : { type: "set", keys };
}

/**
 * Emphasis keys shown while legend focus is enabled vs disabled.
 * When disabled, chart-local preview and local commits must not mute the plot
 * (controls are gone). Controller emphasis still flows through when present.
 */
export function resolveLegendEmphasisKeys(input: {
  readonly legendFocusEnabled: boolean;
  readonly previewKeys: readonly PropertyKey[] | null;
  readonly controllerKeys: readonly PropertyKey[] | null;
  readonly localKeys: readonly PropertyKey[];
}): readonly PropertyKey[] {
  if (!input.legendFocusEnabled) return input.controllerKeys ?? [];
  return input.previewKeys ?? input.controllerKeys ?? input.localKeys;
}

export type LegendPreviewState = {
  readonly identity: LegendEntryIdentity;
  readonly keys: readonly PropertyKey[];
};

/**
 * Reconcile a transient preview against the current entry list / key index.
 * Clears when the identity disappears or its keys empty; refreshes keys when
 * membership changes for the same identity.
 */
export function reconcileLegendPreview(input: {
  readonly preview: LegendPreviewState | null;
  readonly entries: readonly InteractiveLegendEntry[];
  readonly keyIndex: ReadonlyMap<string, readonly PropertyKey[]>;
}): LegendPreviewState | null {
  if (input.preview === null) return null;
  const current = input.entries.find(
    ({ identity }) =>
      identity.scale === input.preview!.identity.scale &&
      identity.entryIndex === input.preview!.identity.entryIndex,
  );
  if (current === undefined) return null;
  const keys = keysForLegendEntry(input.keyIndex, current.identity);
  if (keys.length === 0) return null;
  if (samePropertyKeySet(keys, input.preview.keys)) return input.preview;
  return { identity: current.identity, keys };
}
