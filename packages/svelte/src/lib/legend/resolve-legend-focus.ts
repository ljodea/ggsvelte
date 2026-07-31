/**
 * Resolve legend-focus capability from host-only GuideLegend `focus` layers
 * and the deprecated plot-level `legendFocus` prop.
 *
 * Interactions stay off PortableSpec: `focus` is stripped before guideLegend()
 * and travels as registry layer kind `legendFocus`.
 *
 * Skeleton (off / children→channels / plot-alone→"all") lives in
 * resolve-legend-capability.ts; this module owns only the focus-specific
 * merge: any explicit `preview: false` wins across prop and children.
 */
import type { LegendFocusInput } from "../interaction/interaction.js";
import type { InteractiveLegendEntry } from "./focus.js";
import {
  filterEntriesByChannels,
  resolveLegendChannelCapability,
  type LegendChannelSet,
} from "./resolve-legend-capability.js";

/** Aesthetic channel a GuideLegend may enable for focus (non-position). */
type LegendFocusChannel = "color" | "fill" | "size" | "linewidth" | "alpha" | "shape" | "linetype";

/** One GuideLegend's host-only focus contribution (null when focus is off). */
export type LegendFocusLayerValue = {
  readonly channel: LegendFocusChannel;
  readonly input: Exclude<LegendFocusInput, false>;
} | null;

export type LegendFocusChannelSet = LegendChannelSet;

export type ResolvedLegendFocusCapability = {
  /**
   * Requested opt-in for wiring advisories (truthy even when keyless
   * degradation later nulls the resolved config).
   */
  readonly requested: LegendFocusInput | false;
  /** Value fed to normalizeInteractionConfig. */
  readonly configInput: LegendFocusInput | false;
  /**
   * `"all"` = deprecated plot prop only (every discrete interactive legend).
   * Otherwise only legends whose aesthetics intersect this set get targets.
   */
  readonly channels: LegendFocusChannelSet;
};

type LegendFocusLayerLike = {
  readonly kind: string;
  /** Live getter or plain field — only read when kind is legendFocus. */
  readonly value?: unknown;
};

/** Merge preview flags: any explicit `preview: false` disables preview. */
function resolvePreview(
  plotProp: LegendFocusInput | undefined,
  children: ReadonlyArray<{ input: Exclude<LegendFocusInput, false> }>,
): boolean {
  if (typeof plotProp === "object" && plotProp.preview === false) return false;
  for (const child of children) {
    if (typeof child.input === "object" && child.input.preview === false) return false;
  }
  return true;
}

function toConfigInput(preview: boolean): Exclude<LegendFocusInput, false> {
  return preview ? true : { preview: false };
}

/**
 * Combine deprecated plot prop + GuideLegend focus children into one capability.
 * Children define per-channel enablement when present; plot prop alone is `"all"`.
 */
export function resolveLegendFocusCapability(input: {
  readonly plotProp: LegendFocusInput | undefined;
  readonly layers: readonly LegendFocusLayerLike[];
}): ResolvedLegendFocusCapability {
  return resolveLegendChannelCapability<LegendFocusInput>({
    plotProp: input.plotProp,
    layers: input.layers,
    layerKind: "legendFocus",
    mergeChildrenConfig: (plotProp, children) => toConfigInput(resolvePreview(plotProp, children)),
  });
}

/**
 * Keep interactive targets whose scene legend aesthetics intersect the
 * enabled channel set. Merged legends expose all aesthetics on
 * `legend.aesthetics` (primary `scale` alone is not enough).
 */
export const filterInteractiveLegendEntries: (
  entries: readonly InteractiveLegendEntry[],
  channels: LegendFocusChannelSet,
) => InteractiveLegendEntry[] = filterEntriesByChannels;

/** True when `focus` is an active opt-in (boolean true or options object). */
export function isLegendFocusPropEnabled(
  focus: LegendFocusInput | undefined,
): focus is Exclude<LegendFocusInput, false> {
  return focus !== undefined && focus !== false;
}
