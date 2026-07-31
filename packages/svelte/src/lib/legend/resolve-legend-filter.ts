/**
 * Resolve legend-filter capability from host-only GuideLegend `filter` layers
 * and the deprecated plot-level `legendFilter` prop.
 *
 * Interactions stay off PortableSpec: `filter` is stripped before guideLegend()
 * and travels as registry layer kind `legendFilter`.
 *
 * Skeleton (off / children→channels / plot-alone→"all") lives in
 * resolve-legend-capability.ts; this module owns only the filter-specific
 * merge: last explicit `mode`/`multiple` wins (plot first, then children in
 * registry order).
 */
import type { LegendFilterInput } from "./filter.js";
import {
  filterEntriesByChannels,
  resolveLegendChannelCapability,
  type LegendChannelSet,
} from "./resolve-legend-capability.js";

/** Aesthetic channel a GuideLegend may enable for filter (non-position). */
type LegendFilterChannel = "color" | "fill" | "size" | "linewidth" | "alpha" | "shape" | "linetype";

/** One GuideLegend's host-only filter contribution (null when filter is off). */
export type LegendFilterLayerValue = {
  readonly channel: LegendFilterChannel;
  readonly input: Exclude<LegendFilterInput, false>;
} | null;

export type LegendFilterChannelSet = LegendChannelSet;

export type ResolvedLegendFilterCapability = {
  /**
   * Requested opt-in for wiring advisories (truthy when any child or plot
   * prop enables filter).
   */
  readonly requested: LegendFilterInput | false;
  /** Value fed to createLegendFilterState / capability resolve. */
  readonly configInput: LegendFilterInput | false;
  /**
   * `"all"` = deprecated plot prop only (every discrete filterable legend).
   * Otherwise only legends whose aesthetics intersect this set get checkboxes.
   */
  readonly channels: LegendFilterChannelSet;
};

/** Minimal entry shape for channel filtering (avoids importing .svelte.ts). */
type FilterableEntryLike = {
  readonly legend: {
    readonly scale: string;
    readonly aesthetics?: readonly string[];
  };
};

type LegendFilterLayerLike = {
  readonly kind: string;
  /** Live getter or plain field — only read when kind is legendFilter. */
  readonly value?: unknown;
};

function isEnabledInput(
  input: LegendFilterInput | undefined,
): input is Exclude<LegendFilterInput, false> {
  return input !== undefined && input !== false;
}

/**
 * Merge mode/multiple from plot prop + children. Last explicit field wins
 * (plot first, then children in registry order).
 */
function resolveConfigInput(
  plotProp: LegendFilterInput | undefined,
  children: ReadonlyArray<{ input: Exclude<LegendFilterInput, false> }>,
): Exclude<LegendFilterInput, false> {
  let mode: "exclude" | "include" | undefined;
  let multiple: boolean | undefined;

  const consider = (input: Exclude<LegendFilterInput, false>): void => {
    if (input === true) return;
    if (input.mode !== undefined) mode = input.mode;
    if (input.multiple !== undefined) multiple = input.multiple;
  };

  if (isEnabledInput(plotProp)) consider(plotProp);
  for (const child of children) consider(child.input);

  if (mode === undefined && multiple === undefined) return true;
  return {
    ...(mode === undefined ? {} : { mode }),
    ...(multiple === undefined ? {} : { multiple }),
  };
}

/**
 * Combine deprecated plot prop + GuideLegend filter children into one capability.
 * Children define per-channel enablement when present; plot prop alone is `"all"`.
 */
export function resolveLegendFilterCapability(input: {
  readonly plotProp: LegendFilterInput | undefined;
  readonly layers: readonly LegendFilterLayerLike[];
}): ResolvedLegendFilterCapability {
  return resolveLegendChannelCapability<LegendFilterInput>({
    plotProp: input.plotProp,
    layers: input.layers,
    layerKind: "legendFilter",
    mergeChildrenConfig: resolveConfigInput,
  });
}

/**
 * Keep filterable targets whose scene legend aesthetics intersect the
 * enabled channel set. Merged legends expose all aesthetics on
 * `legend.aesthetics` (primary `scale` alone is not enough).
 */
export function filterFilterableLegendEntries<T extends FilterableEntryLike>(
  entries: readonly T[],
  channels: LegendFilterChannelSet,
): T[] {
  return filterEntriesByChannels(entries, channels);
}

/** True when `filter` is an active opt-in (boolean true or options object). */
export function isLegendFilterPropEnabled(
  filter: LegendFilterInput | undefined,
): filter is Exclude<LegendFilterInput, false> {
  return isEnabledInput(filter);
}
