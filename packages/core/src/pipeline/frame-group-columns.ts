/**
 * Layer grouping and carried discrete columns for stats/identity frames.
 */
import { deriveGroups, type ChannelGroupingOverrides } from "../grouping.js";
import {
  cellToNumber,
  type CellValue,
  type Discreteness,
  type ParsedColumnOptions,
} from "../table.js";
import type { ColumnTable } from "../table.js";
import { getTemporalRuntime } from "../temporal-runtime.js";

import { styleBinIndex } from "./style-bin-index.js";
import { positionDiscreteness } from "./temporal-position.js";
import type { LayerBinding, StyleBinding } from "./types.js";

/**
 * Global semantic [low, high] for a binned style field, computed from the
 * pre-facet table. Stored on the binding so per-panel grouping bins align with
 * the globally-trained style scale instead of rescaling to panel-local extent.
 */
export function styleBinExtent(
  binding: LayerBinding["size"],
  table: ColumnTable,
): readonly [number, number] | undefined {
  if (binding.binned !== true || binding.field === null || !table.has(binding.field))
    return undefined;
  const parser = binding.binParse ?? "auto";
  const options = {
    ...(binding.binTimezone !== undefined && { timezone: binding.binTimezone }),
    ...(binding.binDisambiguation !== undefined && {
      disambiguation: binding.binDisambiguation,
    }),
  };
  const numeric = table.parsed(binding.field, parser, options).semantic;
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const value of numeric) {
    if (!Number.isFinite(value)) continue;
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  return Number.isFinite(low) ? [low, high] : undefined;
}

function binnedStyleColumn(
  binding: LayerBinding["size"],
  table: ColumnTable,
): readonly CellValue[] | undefined {
  if (binding.binned !== true || binding.field === null || !table.has(binding.field))
    return undefined;
  const parser = binding.binParse ?? "auto";
  const options = {
    ...(binding.binTimezone !== undefined && { timezone: binding.binTimezone }),
    ...(binding.binDisambiguation !== undefined && {
      disambiguation: binding.binDisambiguation,
    }),
  };
  const numeric = table.parsed(binding.field, parser, options).semantic;
  const semanticOf = semanticValue(binding, options);
  const inferred = numericExtent(numeric);
  if (inferred === undefined) return Array.from({ length: numeric.length }, () => null);
  const domainNumbers = binding.binDomain
    ?.map((value) => semanticOf(value))
    .filter((value) => isNumber(value));
  // The style-scale trainer normalizes an authored domain with Math.min/max
  // before deriving default breaks (scale-style.ts). A reversed authored domain
  // like [10, 0] would otherwise produce descending breaks here and treat every
  // in-domain value as out-of-bounds, so grouping bins would diverge from the
  // rendered scale. Normalize the bounds to match the trainer.
  const rawLow = domainNumbers?.[0] ?? binding.binExtent?.[0] ?? inferred[0];
  const rawHigh = domainNumbers?.at(-1) ?? binding.binExtent?.[1] ?? inferred[1];
  const low = Math.min(rawLow, rawHigh);
  const high = Math.max(rawLow, rawHigh);
  const binCount = binding.binCount ?? 5;
  const configuredBreaks = binding.binBreaks
    ?.map((value) => semanticOf(value))
    .filter((value) => isNumber(value));
  const breaks = resolveBinBreaks(configuredBreaks, binCount, low, high);
  return Array.from(numeric, (value) => {
    if (!Number.isFinite(value)) return null;
    let bounded = value;
    if (value < breaks[0]! || value > breaks.at(-1)!) {
      if (binding.binOob !== "squish") return null;
      bounded = Math.min(breaks.at(-1)!, Math.max(breaks[0]!, value));
    }
    return styleBinIndex(breaks, bounded);
  });
}

function resolveBinBreaks(
  configured: readonly number[] | undefined,
  binCount: number,
  low: number,
  high: number,
): readonly number[] {
  return configured !== undefined && configured.length >= 2
    ? configured
    : Array.from({ length: binCount + 1 }, (_, index) => low + ((high - low) * index) / binCount);
}

function isNumber(value: number | undefined): value is number {
  return value !== undefined;
}

function semanticValue(
  binding: LayerBinding["size"],
  options: ParsedColumnOptions,
): (value: CellValue) => number | undefined {
  return (value) => {
    if (binding.binTemporal === true) {
      const runtime = getTemporalRuntime();
      if (runtime !== null) {
        const result = runtime.parseColumn([value], binding.binParse ?? "auto", options);
        return result.valid[0] === 1 ? result.semantic[0] : undefined;
      }
    }
    const number = cellToNumber(value);
    return Number.isFinite(number) ? number : undefined;
  };
}

function numericExtent(values: Iterable<number>): readonly [number, number] | undefined {
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  return Number.isFinite(low) ? [low, high] : undefined;
}

export function deriveLayerGroups(binding: LayerBinding, table: ColumnTable): number[] {
  const aes = binding.layer.aes ?? {};
  // Explicit aes.group wins outright in deriveGroups — skip per-channel
  // discreteness / binned style probes (table.discreteness parses columns).
  const groupChannel = aes["group"];
  if (groupChannel !== undefined && groupChannel !== null && !("stat" in groupChannel)) {
    return deriveGroups(table.columns(), { group: groupChannel }).groups as number[];
  }
  const { declared, overrides } = groupingInputs(binding, table, aes);
  return deriveGroups(table.columns(), aes, declared, overrides).groups as number[];
}

function groupingInputs(
  binding: LayerBinding,
  table: ColumnTable,
  aes: NonNullable<LayerBinding["layer"]["aes"]>,
): {
  declared: Record<string, Discreteness>;
  overrides: Record<string, ChannelGroupingOverrides[string]>;
} {
  const declared: Record<string, Discreteness> = {};
  const overrides: Record<string, ChannelGroupingOverrides[string]> = {};
  for (const [channel, mapping] of Object.entries(aes)) {
    const entry = groupingInput(binding, table, channel, mapping);
    if (entry === undefined) continue;
    declared[entry.field] = entry.discreteness;
    overrides[channel] = entry.override;
  }
  return { declared, overrides };
}

function groupingInput(
  binding: LayerBinding,
  table: ColumnTable,
  channel: string,
  mapping: unknown,
):
  | { field: string; discreteness: Discreteness; override: ChannelGroupingOverrides[string] }
  | undefined {
  if (
    mapping === null ||
    mapping === undefined ||
    typeof mapping !== "object" ||
    !("field" in mapping)
  )
    return undefined;
  const field = mapping.field;
  if (typeof field !== "string" || !table.has(field)) return undefined;
  const conversion = positionConversion(binding, field);
  const style = styleBinding(binding, channel);
  const discreteness = isForcedDiscrete(binding, channel)
    ? "discrete"
    : style?.forcedContinuous === true
      ? "continuous"
      : conversion === null
        ? table.discreteness(field)
        : positionDiscreteness(table, field, conversion);
  const binned = style === null ? undefined : binnedStyleColumn(style, table);
  return {
    field,
    discreteness,
    override: { discreteness, ...(binned !== undefined && { column: binned }) },
  };
}

function positionConversion(binding: LayerBinding, field: string) {
  if (field === binding.xField || field === binding.xminField || field === binding.xmaxField)
    return binding.xConversion;
  if (field === binding.yField || field === binding.yminField || field === binding.ymaxField)
    return binding.yConversion;
  return null;
}

function isForcedDiscrete(binding: LayerBinding, channel: string): boolean {
  if (channel === "color") return binding.color.forcedDiscrete === true;
  if (channel === "fill") return binding.fill.forcedDiscrete === true;
  return styleBinding(binding, channel)?.forcedDiscrete === true;
}

function styleBinding(binding: LayerBinding, channel: string): StyleBinding | null {
  if (
    channel === "size" ||
    channel === "linewidth" ||
    channel === "alpha" ||
    channel === "shape" ||
    channel === "linetype"
  ) {
    return binding[channel];
  }
  return null;
}

/** Carried mapped columns for stats (styles/label, minus the x field). */
export function carriedColumns(
  binding: LayerBinding,
  table: ColumnTable,
): Record<string, readonly CellValue[]> {
  const carried: Record<string, readonly CellValue[]> = {};
  for (const field of [
    binding.color.field,
    binding.fill.field,
    binding.size.field,
    binding.linewidth.field,
    binding.alpha.field,
    binding.shape.field,
    binding.linetype.field,
    binding.labelField,
  ]) {
    if (field !== null && field !== binding.xField) carried[field] = table.column(field);
  }
  return carried;
}
