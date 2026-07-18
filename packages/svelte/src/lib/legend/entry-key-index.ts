/**
 * Pure legend entry → semantic-key index builders.
 *
 * Reactive service: `entry-key-index.svelte.ts`. Identity/roving helpers: `focus.ts`.
 */
import type { CellValue, SceneLegend, SceneLegendEntry } from "@ggsvelte/core";
import { encodeKey } from "@ggsvelte/core";

import { iterateCandidates, type CandidateLookup } from "../selection/selection.js";
import { legendIdentityKey } from "./focus.js";

/**
 * Stable Map key with the same equality as `legendValueEqual`:
 * Date by getTime, NaN ≡ NaN, and `-0` ≡ `0` (unlike raw `encodeKey`).
 */
function legendValueToken(value: unknown): string {
  if (typeof value === "number" && Object.is(value, -0)) return encodeKey(0);
  return encodeKey(value);
}

/** First-match entryIndex map for one discrete legend (findIndex semantics). */
function buildEntryIndexByToken(entries: readonly SceneLegendEntry[]): ReadonlyMap<string, number> {
  const byToken = new Map<string, number>();
  for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
    const token = legendValueToken(entries[entryIndex]!.value);
    if (!byToken.has(token)) byToken.set(token, entryIndex);
  }
  return byToken;
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
 * - Match entry values via pre-built token→index maps (legendValueEqual
 *   semantics: NaN, Date, -0/0); O(E) prep + O(1) per row, not findIndex.
 * - Layer field maps built once per layer (first non-stat channel → field);
 *   lineage Sets once per candidate when any discrete legend applies.
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

/**
 * First non-stat field per channel for one layer — same selection as
 * `fields.find(m => m.channel === scale && m.source !== "stat")`.
 * Built once per layer so candidate×legend walks are O(1) field lookups.
 */
function indexLayerFieldsByChannel(
  fields: readonly LegendMappedField[] | undefined,
): ReadonlyMap<string, string> {
  const byChannel = new Map<string, string>();
  if (fields === undefined) return byChannel;
  for (const mapped of fields) {
    if (mapped.source === "stat") continue;
    if (!byChannel.has(mapped.channel)) byChannel.set(mapped.channel, mapped.field);
  }
  return byChannel;
}

export function buildLegendEntryKeyIndex(
  adapter: LegendKeyIndexAdapter,
): ReadonlyMap<string, readonly PropertyKey[]> {
  const index = new Map<string, PropertyKey[]>();
  /** Discrete legends only — ramp legends never contribute buckets. */
  const discreteLegends: Extract<SceneLegend, { type: "discrete" }>[] = [];
  /** Per discrete legend: value-token → first matching entryIndex. */
  const entryLookupByLegend = new Map<
    Extract<SceneLegend, { type: "discrete" }>,
    ReadonlyMap<string, number>
  >();
  for (const sceneLegend of adapter.legends) {
    if (sceneLegend.type !== "discrete") continue;
    discreteLegends.push(sceneLegend);
    for (let entryIndex = 0; entryIndex < sceneLegend.entries.length; entryIndex++)
      index.set(legendIdentityKey({ scale: sceneLegend.scale, entryIndex }), []);
    entryLookupByLegend.set(sceneLegend, buildEntryIndexByToken(sceneLegend.entries));
  }
  // Lazy: layerIndex → channel → first non-stat field (O(F) once per layer).
  const fieldsByLayer = new Map<number, ReadonlyMap<string, string>>();
  const fieldFor = (layerIndex: number, scale: string): string | undefined => {
    let byChannel = fieldsByLayer.get(layerIndex);
    if (byChannel === undefined) {
      byChannel = indexLayerFieldsByChannel(adapter.layerFields(layerIndex));
      fieldsByLayer.set(layerIndex, byChannel);
    }
    return byChannel.get(scale);
  };

  const visited = new Set<string>();
  for (const candidate of adapter.candidates()) {
    // Lineage Set once per candidate when any discrete legend applies —
    // not once per legend (was O(C·L·R) Set construction).
    let sourceRows: Set<number> | null = null;
    const rowsForCandidate = (): Set<number> => {
      if (sourceRows === null) {
        sourceRows = new Set(adapter.lineageKeys(candidate.lineage));
        if (candidate.rowIndex !== null) sourceRows.add(candidate.rowIndex);
      }
      return sourceRows;
    };

    for (const sceneLegend of discreteLegends) {
      const field = fieldFor(candidate.layerIndex, sceneLegend.scale);
      const scaledConstant =
        field === undefined
          ? adapter.layerScaledConstant?.(candidate.layerIndex, sceneLegend.scale)
          : undefined;
      if (field === undefined && scaledConstant === undefined) continue;
      const entryByToken = entryLookupByLegend.get(sceneLegend)!;
      for (const rowIndex of rowsForCandidate()) {
        const visitField = field ?? `const:${String(scaledConstant)}`;
        const visit = `${sceneLegend.scale}:${String(candidate.layerIndex)}:${visitField}:${String(rowIndex)}`;
        if (visited.has(visit)) continue;
        visited.add(visit);
        const key = adapter.semanticKey(rowIndex);
        if (key === null || key === undefined) continue;
        const matched = resolveLegendMatchValue(adapter, field, scaledConstant, rowIndex);
        if (matched.skip) continue;
        const entryIndex = entryByToken.get(legendValueToken(matched.value));
        if (entryIndex === undefined) continue;
        index.get(legendIdentityKey({ scale: sceneLegend.scale, entryIndex }))?.push(key);
      }
    }
  }
  return new Map(
    [...index].map(([identity, keys]) => [identity, Object.freeze([...new Set(keys)])]),
  );
}
