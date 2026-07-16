import type {
  A11yMode,
  AesInput,
  CoordSpec,
  DataInput,
  FacetInput,
  GeomName,
  Labs,
  LayerInput,
  LegendSpec,
  PortableSpec,
  PositionName,
  PositionParams,
  RenderBackend,
  Scales,
  SpecInput,
  StatName,
  ThemeName,
  ThemeSpec,
} from "@ggsvelte/spec";
import { gg, normalize } from "@ggsvelte/spec";

import type { PlotInteractionScope, ZoomInput } from "./interaction.js";

/**
 * Structural registry descriptor (live getters allowed). Kept local so this
 * module does not import `registry.svelte.ts`.
 */
export type LayerDescriptorLike = {
  readonly geom: GeomName;
  readonly stat?: StatName | undefined;
  readonly aes?: AesInput | undefined;
  readonly position?: PositionName | undefined;
  readonly positionParams?: PositionParams | undefined;
  readonly render?: RenderBackend | undefined;
  readonly params?: Record<string, unknown> | undefined;
};

/** Convert a registry descriptor into a LayerInput (reads live getters). */
export function toLayerInput(descriptor: LayerDescriptorLike): LayerInput {
  return {
    geom: descriptor.geom,
    ...(descriptor.stat !== undefined && { stat: descriptor.stat }),
    ...(descriptor.position !== undefined && {
      position: descriptor.position,
    }),
    ...(descriptor.positionParams !== undefined && {
      positionParams: descriptor.positionParams,
    }),
    ...(descriptor.render !== undefined && { render: descriptor.render }),
    ...(descriptor.aes !== undefined && { aes: descriptor.aes }),
    ...(descriptor.params !== undefined && { params: descriptor.params }),
  } as LayerInput;
}

export type AssemblePortableSpecInput = {
  readonly spec?: SpecInput;
  readonly data?: DataInput | readonly Record<string, unknown>[];
  readonly aes?: AesInput;
  /** Already-resolved layers (caller maps registry descriptors if needed). */
  readonly layers: LayerInput[];
  readonly facet?: FacetInput;
  readonly coord?: CoordSpec | "flip";
  readonly scales?: Scales;
  readonly legend?: LegendSpec;
  readonly theme?: ThemeName | ThemeSpec;
  readonly labs?: Labs;
  readonly a11y?: A11yMode;
};

/**
 * Whether this plot instance should take the faceted interaction path
 * (disable brush zoom / interval select with a diagnostic).
 *
 * True when either:
 * - the raw `facet` prop is set (covers declaration-only children before layers
 *   register and `assembled` is still null), or
 * - `assembled.facet` is set (covers portable-`spec` plots that embed facet
 *   without a separate prop).
 */
export function isFacetedPlotIntent(input: {
  readonly facet?: FacetInput | undefined;
  readonly assembled: PortableSpec | null;
}): boolean {
  return input.facet !== undefined || input.assembled?.facet !== undefined;
}

/**
 * Build the normalized PortableSpec for GGPlot.
 * Explicit `spec` wins; empty `layers` yields null (no plot).
 */
export function assemblePortableSpec(input: AssemblePortableSpecInput): PortableSpec | null {
  if (input.spec !== undefined) return normalize(input.spec);
  if (input.layers.length === 0) return null;
  let builder = gg(input.data as DataInput, input.aes);
  for (const layer of input.layers) builder = builder.layer(layer);
  if (input.facet !== undefined) builder = builder.facet(input.facet);
  if (input.coord !== undefined) builder = builder.coord(input.coord);
  if (input.a11y !== undefined) builder = builder.a11y(input.a11y);
  if (input.scales !== undefined) builder = builder.scales(input.scales);
  if (input.legend !== undefined) builder = builder.legend(input.legend);
  if (input.theme !== undefined) builder = builder.theme(input.theme);
  if (input.labs !== undefined) builder = builder.labs(input.labs);
  return builder.spec();
}

/**
 * Field name for a positional channel from plot/layer aes, else the channel
 * itself (constants / missing mappings).
 */
export function mappedChannelField(assembled: PortableSpec | null, channel: "x" | "y"): string {
  const channelValue =
    assembled?.aes?.[channel] ??
    assembled?.layers.find(
      (layer) => layer.aes?.[channel] !== undefined && layer.aes[channel] !== null,
    )?.aes?.[channel];
  return channelValue !== undefined && channelValue !== null && "field" in channelValue
    ? channelValue.field
    : channel;
}

export type ResolveInteractionScopeInput = {
  /** Presence-only: any defined controller forces controlled scope rules. */
  readonly interaction: object | null | undefined;
  readonly interactionScope?: PlotInteractionScope;
  readonly zoom?: ZoomInput;
  /**
   * When true, zoom is unsupported (same as normalizeInteractionConfig) and
   * must not force domain scopes — faceted plots use a diagnostic/no-op path.
   */
  readonly faceted?: boolean;
  readonly datumKey?: string | number | symbol | ((...args: never[]) => PropertyKey);
  readonly assembled: PortableSpec | null;
};

/**
 * Resolve the semantic interaction scope for a plot instance.
 * Controlled plots never infer domain scopes; uncontrolled plots do.
 */
export function resolveInteractionScope(input: ResolveInteractionScopeInput): PlotInteractionScope {
  if (input.interaction !== undefined) {
    if (input.interactionScope === undefined)
      throw new TypeError(
        "GGPlot requires interactionScope when interaction is supplied so unrelated charts cannot share semantic keys or domains accidentally.",
      );
    // Mirror normalizeInteractionConfig: faceted zoom is disabled with a
    // diagnostic, so missing x/y scopes must not hard-fail render.
    const zoomMode =
      input.faceted === true
        ? null
        : input.zoom === true
          ? "xy"
          : typeof input.zoom === "object"
            ? input.zoom.mode
            : null;
    if (zoomMode !== null) {
      if (zoomMode !== "y" && input.interactionScope.x === undefined)
        throw new TypeError(
          "Controlled x zoom requires interactionScope.x; controlled plots never infer domain scopes.",
        );
      if (zoomMode !== "x" && input.interactionScope.y === undefined)
        throw new TypeError(
          "Controlled y zoom requires interactionScope.y; controlled plots never infer domain scopes.",
        );
    }
    return Object.freeze({
      keys: input.interactionScope.keys,
      ...(input.interactionScope.x !== undefined && {
        x: input.interactionScope.x,
      }),
      ...(input.interactionScope.y !== undefined && {
        y: input.interactionScope.y,
      }),
    });
  }
  return Object.freeze({
    keys: typeof input.datumKey === "string" ? input.datumKey : "default",
    x: mappedChannelField(input.assembled, "x"),
    y: mappedChannelField(input.assembled, "y"),
  });
}
