/**
 * Resolve legend-focus capability from host-only GuideLegend `focus` layers
 * and the deprecated plot-level `legendFocus` prop.
 *
 * Interactions stay off PortableSpec: `focus` is stripped before guideLegend()
 * and travels as registry layer kind `legendFocus`.
 */
import type { LegendFocusInput } from "../interaction/interaction.js";
import type { InteractiveLegendEntry } from "./focus.js";

/** Aesthetic channel a GuideLegend may enable for focus (non-position). */
type LegendFocusChannel = "color" | "fill" | "size" | "linewidth" | "alpha" | "shape" | "linetype";

/** One GuideLegend's host-only focus contribution (null when focus is off). */
export type LegendFocusLayerValue = {
  readonly channel: LegendFocusChannel;
  readonly input: Exclude<LegendFocusInput, false>;
} | null;

export type LegendFocusChannelSet = ReadonlySet<string> | "all";

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

function isEnabledInput(
  input: LegendFocusInput | undefined,
): input is Exclude<LegendFocusInput, false> {
  return input !== undefined && input !== false;
}

function readChildLayers(
  layers: readonly LegendFocusLayerLike[],
): ReadonlyArray<{ channel: string; input: Exclude<LegendFocusInput, false> }> {
  const out: Array<{ channel: string; input: Exclude<LegendFocusInput, false> }> = [];
  for (const layer of layers) {
    if (layer.kind !== "legendFocus") continue;
    // Layer values may be live getters (registry) — read via property access.
    const value = (layer as { value: LegendFocusLayerValue }).value;
    if (value === null || value === undefined) continue;
    if (!isEnabledInput(value.input)) continue;
    out.push({ channel: value.channel, input: value.input });
  }
  return out;
}

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
  const children = readChildLayers(input.layers);
  const plotOn = isEnabledInput(input.plotProp);

  if (children.length === 0 && !plotOn) {
    return { requested: false, configInput: false, channels: new Set() };
  }

  const preview = resolvePreview(input.plotProp, children);
  const configInput = toConfigInput(preview);

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
 * Keep interactive targets whose scene legend aesthetics intersect the
 * enabled channel set. Merged legends expose all aesthetics on
 * `legend.aesthetics` (primary `scale` alone is not enough).
 */
export function filterInteractiveLegendEntries(
  entries: readonly InteractiveLegendEntry[],
  channels: LegendFocusChannelSet,
): InteractiveLegendEntry[] {
  if (channels === "all") return entries.slice();
  if (channels.size === 0) return [];
  return entries.filter((entry) => {
    const aesthetics = entry.legend.aesthetics ?? [entry.legend.scale];
    return aesthetics.some((aesthetic) => channels.has(aesthetic));
  });
}

/** True when `focus` is an active opt-in (boolean true or options object). */
export function isLegendFocusPropEnabled(
  focus: LegendFocusInput | undefined,
): focus is Exclude<LegendFocusInput, false> {
  return isEnabledInput(focus);
}
