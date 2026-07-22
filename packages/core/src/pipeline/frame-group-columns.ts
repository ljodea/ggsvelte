/**
 * Layer grouping and carried discrete columns for stats/identity frames.
 */
import { parseTemporal, parseTemporalColumn } from "@ggsvelte/spec";

import { deriveGroups, type ChannelGroupingOverrides } from "../grouping.js";
import { cellToNumber, type CellValue, type Discreteness } from "../table.js";
import type { ColumnTable } from "../table.js";

import { positionDiscreteness } from "./temporal-position.js";
import type { LayerBinding } from "./types.js";

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
  const parsed = table.parsed(binding.field, parser, options);
  const numeric = parsed.semantic;
  const semanticOf = (value: CellValue): number | undefined => {
    if (binding.binTemporal === true) {
      if (binding.binParse !== undefined) {
        const result = parseTemporal(value, binding.binParse, options);
        return result.ok ? result.epochMs : undefined;
      }
      const result = parseTemporalColumn([value], "auto", options);
      return result.valid[0] === 1 ? result.semantic[0] : undefined;
    }
    const number = cellToNumber(value);
    return Number.isFinite(number) ? number : undefined;
  };
  let inferredLow = Number.POSITIVE_INFINITY;
  let inferredHigh = Number.NEGATIVE_INFINITY;
  for (const value of numeric) {
    if (!Number.isFinite(value)) continue;
    inferredLow = Math.min(inferredLow, value);
    inferredHigh = Math.max(inferredHigh, value);
  }
  if (!Number.isFinite(inferredLow)) return Array.from({ length: numeric.length }, () => null);
  const domainNumbers = binding.binDomain
    ?.map(semanticOf)
    .filter((value): value is number => value !== undefined);
  // The style-scale trainer normalizes an authored domain with Math.min/max
  // before deriving default breaks (scale-style.ts). A reversed authored domain
  // like [10, 0] would otherwise produce descending breaks here and treat every
  // in-domain value as out-of-bounds, so grouping bins would diverge from the
  // rendered scale. Normalize the bounds to match the trainer.
  const rawLow = domainNumbers?.[0] ?? binding.binExtent?.[0] ?? inferredLow;
  const rawHigh = domainNumbers?.at(-1) ?? binding.binExtent?.[1] ?? inferredHigh;
  const low = Math.min(rawLow, rawHigh);
  const high = Math.max(rawLow, rawHigh);
  const binCount = binding.binCount ?? 5;
  const configuredBreaks = binding.binBreaks
    ?.map(semanticOf)
    .filter((value): value is number => value !== undefined);
  const breaks =
    configuredBreaks !== undefined && configuredBreaks.length >= 2
      ? configuredBreaks
      : Array.from({ length: binCount + 1 }, (_, index) => low + ((high - low) * index) / binCount);
  return Array.from(numeric, (value) => {
    if (!Number.isFinite(value)) return null;
    let bounded = value;
    if (value < breaks[0]! || value > breaks.at(-1)!) {
      if (binding.binOob !== "squish") return null;
      bounded = Math.min(breaks.at(-1)!, Math.max(breaks[0]!, value));
    }
    let bin = breaks.findIndex((upper, index) => index > 0 && bounded < upper) - 1;
    if (bin < 0) bin = breaks.length - 2;
    return bin;
  });
}

export function deriveLayerGroups(binding: LayerBinding, table: ColumnTable): number[] {
  const aes = binding.layer.aes ?? {};
  const declared: Record<string, Discreteness> = {};
  const overrides: Record<string, ChannelGroupingOverrides[string]> = {};
  for (const [channel, mapping] of Object.entries(aes)) {
    if (
      mapping !== null &&
      mapping !== undefined &&
      "field" in mapping &&
      table.has(mapping.field)
    ) {
      const conversion =
        mapping.field === binding.xField
          ? binding.xConversion
          : mapping.field === binding.yField ||
              mapping.field === binding.yminField ||
              mapping.field === binding.ymaxField
            ? binding.yConversion
            : undefined;
      const forcedDiscrete =
        (channel === "color" && binding.color.forcedDiscrete === true) ||
        (channel === "fill" && binding.fill.forcedDiscrete === true) ||
        (channel === "size" && binding.size.forcedDiscrete === true) ||
        (channel === "linewidth" && binding.linewidth.forcedDiscrete === true) ||
        (channel === "alpha" && binding.alpha.forcedDiscrete === true) ||
        (channel === "shape" && binding.shape.forcedDiscrete === true) ||
        (channel === "linetype" && binding.linetype.forcedDiscrete === true);
      const style =
        channel === "size" ||
        channel === "linewidth" ||
        channel === "alpha" ||
        channel === "shape" ||
        channel === "linetype"
          ? binding[channel]
          : undefined;
      const discreteness = forcedDiscrete
        ? "discrete"
        : style?.forcedContinuous === true
          ? "continuous"
          : conversion === undefined
            ? table.discreteness(mapping.field)
            : positionDiscreteness(table, mapping.field, conversion);
      declared[mapping.field] = discreteness;
      const binned = style === undefined ? undefined : binnedStyleColumn(style, table);
      overrides[channel] = {
        discreteness,
        ...(binned !== undefined && { column: binned }),
      };
    }
  }
  return [...deriveGroups(table.columns(), aes, declared, overrides).groups];
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
