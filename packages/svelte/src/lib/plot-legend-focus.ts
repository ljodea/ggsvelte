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
 * - Row membership = lineage row indexes (insertion order) then candidate
 *   rowIndex if not already present.
 * - Visit key is scale:layerIndex:field:rowIndex (dedupe repeated candidates).
 * - Skip null rows and null/undefined semantic keys.
 * - Match entry values with legendValueEqual (NaN, Date, -0/0).
 * - Final keys are first-seen unique order, frozen.
 */
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
      if (field === undefined) continue;
      const sourceRows = new Set(adapter.lineageKeys(candidate.lineage));
      if (candidate.rowIndex !== null) sourceRows.add(candidate.rowIndex);
      for (const rowIndex of sourceRows) {
        const visit = `${sceneLegend.scale}:${String(candidate.layerIndex)}:${field}:${String(rowIndex)}`;
        if (visited.has(visit)) continue;
        visited.add(visit);
        const row = adapter.row(rowIndex);
        const key = adapter.semanticKey(rowIndex);
        if (row === null || key === null || key === undefined) continue;
        const entryIndex = sceneLegend.entries.findIndex((entry) =>
          legendValueEqual(entry.value, row[field]),
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
