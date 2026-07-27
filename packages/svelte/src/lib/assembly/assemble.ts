import type {
  A11yMode,
  AesInput,
  CoordSpec,
  DataInput,
  FacetInput,
  GuidesSpec,
  Labs,
  LayerInput,
  LegendSpec,
  PortableSpec,
  Scales,
  SpecInput,
  ThemeName,
  ThemeSpec,
} from "@ggsvelte/spec";
import { gg, normalize } from "@ggsvelte/spec";

import type { PlotInteractionScope, ZoomInput } from "../interaction/interaction.js";
import { foldPlotLayer } from "../layers/fold.js";
import type { MarkLayerDescriptor, PlotLayerLike } from "../layers/types.js";

/**
 * Structural mark-layer descriptor (live getters allowed). Alias of the shared
 * MarkLayerDescriptor so callers that already import from assemble keep working
 * without pulling in the `.svelte.ts` registry (#785).
 */
export type MarkLayerDescriptorLike = MarkLayerDescriptor;

/** True when an object is already a single-key DataRef container. */
function isWrappedDataRef(data: object): data is NonNullable<LayerInput["data"]> {
  const keys = Object.keys(data);
  if (keys.length !== 1) return false;
  const key = keys[0]!;
  if (key === "name") return typeof (data as { name: unknown }).name === "string";
  if (key === "values") return Array.isArray((data as { values: unknown }).values);
  if (key === "columns") {
    const columns = (data as { columns: unknown }).columns;
    return typeof columns === "object" && columns !== null && !Array.isArray(columns);
  }
  return false;
}

/** Wrap geom data props into a DataRef shape for LayerInput. */
function layerDataRef(
  data: DataInput | readonly Record<string, unknown>[],
): NonNullable<LayerInput["data"]> {
  if (Array.isArray(data)) return { values: data as never };
  if (typeof data === "object" && data !== null) {
    if (isWrappedDataRef(data)) return data;
    // Column-oriented bare object.
    return { columns: data as never };
  }
  return { values: [] };
}

/** Convert a registry descriptor into a LayerInput (reads live getters). */
export function toLayerInput(descriptor: MarkLayerDescriptorLike): LayerInput {
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
    ...(descriptor.data !== undefined && { data: layerDataRef(descriptor.data) }),
    ...(descriptor.params !== undefined && { params: descriptor.params }),
  } as LayerInput;
}

export type AssemblePortableSpecInput = {
  readonly spec?: SpecInput;
  readonly data?: DataInput | readonly Record<string, unknown>[];
  readonly aes?: AesInput;
  /** Already-resolved layers (caller maps registry descriptors if needed). */
  readonly layers: LayerInput[];
  /**
   * Non-mark registry layers (theme/scale/coord/facet/labs/guides/legend).
   * Folded after both gates and after props, in registration order — children
   * win over props so mid-migration files that keep the deprecated prop still
   * pick up the destination child form (D2 / #659).
   */
  readonly plotLayers?: readonly PlotLayerLike[];
  readonly facet?: FacetInput;
  readonly coord?: CoordSpec | "flip";
  readonly scales?: Scales;
  readonly guides?: GuidesSpec;
  readonly legend?: LegendSpec;
  readonly theme?: ThemeName | ThemeSpec;
  readonly labs?: Labs;
  readonly a11y?: A11yMode;
};

/**
 * Whether this plot instance should take the faceted interaction path
 * (disable brush zoom / interval select with a diagnostic).
 *
 * True when any of:
 * - a `kind: "facet"` registry plot layer is present (`<FacetWrap/>` / …),
 * - `assembled.facet` is set (covers portable-`spec` plots that embed facet).
 *
 * The raw GGPlot `facet` prop was removed in 0.13.0 (#704); facet intent is
 * children- or portable-spec-only.
 */
export function isFacetedPlotIntent(input: {
  readonly plotLayers?: readonly { readonly kind: string }[] | undefined;
  readonly assembled: PortableSpec | null;
}): boolean {
  return (
    input.plotLayers?.some((layer) => layer.kind === "facet") === true ||
    input.assembled?.facet !== undefined
  );
}

/**
 * Build the normalized PortableSpec for GGPlot.
 * Explicit `spec` wins over everything (including non-mark children).
 * Empty mark `layers` yields null even when non-mark plotLayers exist —
 * a theme-only plot must not paint an empty axis frame, and PortableSpec.layers
 * is minItems: 1.
 */
export function assemblePortableSpec(input: AssemblePortableSpecInput): PortableSpec | null {
  if (input.spec !== undefined) return normalize(input.spec);
  if (input.layers.length === 0) return null;
  let builder = gg(input.data as DataInput, input.aes);
  for (const layer of input.layers) builder = builder.layer(layer);
  // Props first, then non-mark children (registration order) — children win (D2).
  // REPLACE families (theme/coord/facet): last write wins.
  // MERGE families (scales/guides/labs/legend): {...prev, ...next} puts child last.
  // Fold dispatch is table-driven via foldPlotLayer (#785).
  if (input.facet !== undefined) builder = builder.facet(input.facet);
  if (input.coord !== undefined) builder = builder.coord(input.coord);
  if (input.a11y !== undefined) builder = builder.a11y(input.a11y);
  if (input.scales !== undefined) builder = builder.scales(input.scales);
  if (input.guides !== undefined) builder = builder.guides(input.guides);
  if (input.legend !== undefined) builder = builder.legend(input.legend);
  if (input.theme !== undefined) builder = builder.theme(input.theme);
  if (input.labs !== undefined) builder = builder.labs(input.labs);
  for (const plotLayer of input.plotLayers ?? []) {
    builder = foldPlotLayer(builder, plotLayer);
  }
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
      ...(input.interactionScope.intervals !== undefined && {
        intervals: input.interactionScope.intervals,
      }),
    });
  }
  return Object.freeze({
    keys: typeof input.datumKey === "string" ? input.datumKey : "default",
    x: mappedChannelField(input.assembled, "x"),
    y: mappedChannelField(input.assembled, "y"),
  });
}
