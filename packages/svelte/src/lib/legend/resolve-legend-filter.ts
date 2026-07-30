/**
 * Resolve legend-filter capability from host-only GuideLegend `filter` layers
 * and the deprecated plot-level `legendFilter` prop.
 *
 * Interactions stay off PortableSpec: `filter` is stripped before guideLegend()
 * and travels as registry layer kind `legendFilter`.
 */
import type { LegendFilterInput } from "./filter.js";

/** Aesthetic channel a GuideLegend may enable for filter (non-position). */
type LegendFilterChannel = "color" | "fill" | "size" | "linewidth" | "alpha" | "shape" | "linetype";

/** One GuideLegend's host-only filter contribution (null when filter is off). */
export type LegendFilterLayerValue = {
  readonly channel: LegendFilterChannel;
  readonly input: Exclude<LegendFilterInput, false>;
} | null;

export type LegendFilterChannelSet = ReadonlySet<string> | "all";

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

function readChildLayers(
  layers: readonly LegendFilterLayerLike[],
): ReadonlyArray<{ channel: string; input: Exclude<LegendFilterInput, false> }> {
  const out: Array<{ channel: string; input: Exclude<LegendFilterInput, false> }> = [];
  for (const layer of layers) {
    if (layer.kind !== "legendFilter") continue;
    // Layer values may be live getters (registry) — read via property access.
    const value = (layer as { value: LegendFilterLayerValue }).value;
    if (value === null || value === undefined) continue;
    if (!isEnabledInput(value.input)) continue;
    out.push({ channel: value.channel, input: value.input });
  }
  return out;
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
  const children = readChildLayers(input.layers);
  const plotOn = isEnabledInput(input.plotProp);

  if (children.length === 0 && !plotOn) {
    return { requested: false, configInput: false, channels: new Set() };
  }

  const configInput = resolveConfigInput(input.plotProp, children);

  if (children.length > 0) {
    return {
      requested: configInput,
      configInput,
      channels: new Set(children.map((child) => child.channel)),
    };
  }

  return {
    requested: input.plotProp ?? false,
    configInput: input.plotProp ?? false,
    channels: "all",
  };
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
  if (channels === "all") return entries.slice();
  if (channels.size === 0) return [];
  return entries.filter((entry) => {
    const aesthetics = entry.legend.aesthetics ?? [entry.legend.scale];
    return aesthetics.some((aesthetic) => channels.has(aesthetic));
  });
}

/** True when `filter` is an active opt-in (boolean true or options object). */
export function isLegendFilterPropEnabled(
  filter: LegendFilterInput | undefined,
): filter is Exclude<LegendFilterInput, false> {
  return isEnabledInput(filter);
}
