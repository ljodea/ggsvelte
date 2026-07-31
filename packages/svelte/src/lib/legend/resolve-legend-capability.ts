/**
 * Shared core of the legend channel capabilities (GuideLegend `focus` /
 * `filter`). Owns the skeleton both share: off when nothing enables the kind,
 * children define the channel set and route through the capability-specific
 * merge, a plot prop alone means every channel (`"all"`) and passes the RAW
 * prop through (same reference — no normalization on that path).
 *
 * The capability-specific config merges stay with their owners:
 * focus = any explicit `preview: false` wins; filter = last explicit
 * `mode`/`multiple` wins (plot first, then children in registry order).
 */

export type LegendChannelSet = ReadonlySet<string> | "all";

export type ResolvedLegendChannelCapability<TInput> = {
  /** Opt-in for wiring advisories (truthy even when later checks null it). */
  readonly requested: TInput | false;
  /** Value fed to the capability's config consumer. */
  readonly configInput: TInput | false;
  /** `"all"` = plot prop only; otherwise the children's channel set. */
  readonly channels: LegendChannelSet;
};

/** Registry layer shape (values may be live getters — read via access). */
type ChannelLayerLike = {
  readonly kind: string;
  readonly value?: unknown;
};

type ChannelChild<TInput> = { channel: string; input: Exclude<TInput, false> };

function isEnabledInput<TInput>(input: TInput | undefined): input is Exclude<TInput, false> {
  return input !== undefined && (input as unknown) !== false;
}

function readChildLayers<TInput>(
  layers: readonly ChannelLayerLike[],
  layerKind: string,
): ReadonlyArray<ChannelChild<TInput>> {
  const out: Array<ChannelChild<TInput>> = [];
  for (const layer of layers) {
    if (layer.kind !== layerKind) continue;
    const value = (layer as { value: { channel: string; input: TInput } | null }).value;
    if (value === null || value === undefined) continue;
    if (!isEnabledInput<TInput>(value.input)) continue;
    out.push({ channel: value.channel, input: value.input });
  }
  return out;
}

/**
 * Combine plot prop + declaration children into one channel capability.
 * `mergeChildrenConfig` runs ONLY when children are present — plot-alone
 * returns the raw prop unchanged.
 */
export function resolveLegendChannelCapability<TInput>(args: {
  readonly plotProp: TInput | undefined;
  readonly layers: readonly ChannelLayerLike[];
  readonly layerKind: string;
  readonly mergeChildrenConfig: (
    plotProp: TInput | undefined,
    children: ReadonlyArray<ChannelChild<TInput>>,
  ) => Exclude<TInput, false>;
}): ResolvedLegendChannelCapability<TInput> {
  const children = readChildLayers<TInput>(args.layers, args.layerKind);
  const plotOn = isEnabledInput(args.plotProp);

  if (children.length === 0 && !plotOn) {
    return { requested: false, configInput: false, channels: new Set() };
  }

  if (children.length > 0) {
    const configInput = args.mergeChildrenConfig(args.plotProp, children);
    return {
      requested: configInput,
      configInput,
      channels: new Set(children.map((child) => child.channel)),
    };
  }

  return {
    requested: args.plotProp ?? false,
    configInput: args.plotProp ?? false,
    channels: "all",
  };
}

/**
 * Keep entries whose scene legend aesthetics intersect the enabled channel
 * set. Merged legends expose all aesthetics on `legend.aesthetics` (primary
 * `scale` alone is not enough).
 */
export function filterEntriesByChannels<
  T extends {
    readonly legend: { readonly scale: string; readonly aesthetics?: readonly string[] };
  },
>(entries: readonly T[], channels: LegendChannelSet): T[] {
  if (channels === "all") return entries.slice();
  if (channels.size === 0) return [];
  return entries.filter((entry) => {
    const aesthetics = entry.legend.aesthetics ?? [entry.legend.scale];
    return aesthetics.some((aesthetic) => channels.has(aesthetic));
  });
}
