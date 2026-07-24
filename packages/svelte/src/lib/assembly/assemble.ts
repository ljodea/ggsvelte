import type {
  A11yMode,
  AesInput,
  CoordSpec,
  DataInput,
  FacetInput,
  GeomName,
  GuidesSpec,
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

import type { PlotInteractionScope, ZoomInput } from "../interaction/interaction.js";

/**
 * Structural registry descriptor (live getters allowed). Kept local so this
 * module does not import `registry.svelte.ts`.
 */
export type LayerDescriptorLike = {
  readonly geom: GeomName;
  readonly stat?: StatName | undefined;
  readonly aes?: AesInput | undefined;
  readonly data?: DataInput | readonly Record<string, unknown>[] | undefined;
  readonly position?: PositionName | undefined;
  readonly positionParams?: PositionParams | undefined;
  readonly render?: RenderBackend | undefined;
  readonly params?: Record<string, unknown> | undefined;
};

/**
 * Structural non-mark (and optional mark) plot layer. Same discipline as
 * LayerDescriptorLike: no import of the `.svelte.ts` registry module.
 * Live getters allowed on `value`. Module-private (structural callers pass
 * compatible objects; not a public export).
 */
type PlotLayerLike =
  | { readonly kind: "mark"; readonly descriptor: LayerDescriptorLike }
  | { readonly kind: "scale"; readonly value: Scales }
  | { readonly kind: "theme"; readonly value: ThemeName | ThemeSpec }
  | { readonly kind: "coord"; readonly value: CoordSpec | "flip" }
  | { readonly kind: "facet"; readonly value: FacetInput }
  | { readonly kind: "labs"; readonly value: Labs }
  | { readonly kind: "guides"; readonly value: GuidesSpec }
  | { readonly kind: "legend"; readonly value: LegendSpec };

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
   * Folded after both gates, in registration order, then props win over them
   * this slice (child-wins precedence lands later with the advisory channel).
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
 * - the raw `facet` prop is set (covers declaration-only children before layers
 *   register and `assembled` is still null),
 * - a `kind: "facet"` registry plot layer is present (future `<FacetWrap/>`),
 * - `assembled.facet` is set (covers portable-`spec` plots that embed facet
 *   without a separate prop).
 */
export function isFacetedPlotIntent(input: {
  readonly facet?: FacetInput | undefined;
  readonly plotLayers?: readonly { readonly kind: string }[] | undefined;
  readonly assembled: PortableSpec | null;
}): boolean {
  return (
    input.facet !== undefined ||
    input.plotLayers?.some((layer) => layer.kind === "facet") === true ||
    input.assembled?.facet !== undefined
  );
}

/** Apply one non-mark plot layer onto the fluent builder. */
function applyPlotLayer(
  builder: ReturnType<typeof gg>,
  layer: PlotLayerLike,
): ReturnType<typeof gg> {
  switch (layer.kind) {
    case "mark":
      // Marks travel through `input.layers` (toLayerInput); ignore if present.
      return builder;
    case "scale":
      return builder.scales(layer.value);
    case "theme":
      return builder.theme(layer.value);
    case "coord":
      return builder.coord(layer.value);
    case "facet":
      return builder.facet(layer.value);
    case "labs":
      return builder.labs(layer.value);
    case "guides":
      return builder.guides(layer.value);
    case "legend":
      return builder.legend(layer.value);
    default: {
      // Exhaustiveness: a new Layer kind must be handled here, not silently
      // dropped. `never` makes that a compile error; the throw makes an
      // unforeseen runtime kind loud instead of a missing spec field.
      const unhandled: never = layer;
      throw new TypeError(`Unhandled plot layer kind: ${String(unhandled)}`);
    }
  }
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
  // Non-mark layers first (registration order), then props — props win this slice.
  for (const plotLayer of input.plotLayers ?? []) {
    builder = applyPlotLayer(builder, plotLayer);
  }
  if (input.facet !== undefined) builder = builder.facet(input.facet);
  if (input.coord !== undefined) builder = builder.coord(input.coord);
  if (input.a11y !== undefined) builder = builder.a11y(input.a11y);
  if (input.scales !== undefined) builder = builder.scales(input.scales);
  if (input.guides !== undefined) builder = builder.guides(input.guides);
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
