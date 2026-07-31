/**
 * Fluent builder core: state, layer/facet/coord/labs/theme/spec.
 * Geom sugar mixin: builder-geoms.ts. Scale sugar mixin: builder-scales.ts.
 * Public GGBuilder: builder.ts.
 */
import {
  coordFixed,
  coordSf,
  coordTransform,
  type CoordFixedOptions,
  type CoordSfOptions,
  type CoordTransformOptions,
} from "./coord-helpers.js";
import type { AesInput, FacetInput, LayerInput, SpecInput } from "./normalize.js";
import { normalize } from "./normalize.js";
import {
  calendarDateFields,
  toAuthoringDataRef,
  toDataRef,
  type AuthoringDataRef,
  type DataInput,
} from "./builder-data.js";
import type {
  A11yMode,
  GuidesSpec,
  Labs,
  LegendSpec,
  PortableSpec,
  PositionParams,
  RenderBackend,
  Scales,
  ThemeName,
  ThemeSpec,
} from "./schema.js";
import type { GGBuilder } from "./builder.js";

interface BuilderState {
  readonly data?: AuthoringDataRef;
  readonly aes?: AesInput;
  readonly layers: readonly LayerInput[];
  readonly facet?: FacetInput;
  readonly coord?: SpecInput["coord"];
  readonly a11y?: A11yMode;
  readonly scales?: Scales;
  readonly guides?: GuidesSpec;
  readonly legend?: LegendSpec;
  readonly labs?: Labs;
  readonly theme?: ThemeName | ThemeSpec;
  readonly width?: number;
  readonly height?: number;
}

/** Assemble a LayerInput from a geom name and sugar options. */
export function layerFrom(
  geom: LayerInput["geom"],
  options: {
    aes?: AesInput;
    render?: RenderBackend;
    position?: string;
    positionParams?: PositionParams;
    stat?: string;
    data?: DataInput;
  },
): LayerInput {
  const { aes: layerAes, render, position, positionParams, stat, data, ...params } = options;
  // Snapshot authoring data immediately so later mutation of the caller's array
  // cannot leak into the builder; portable Date→ISO conversion happens in .spec().
  const withData =
    data === undefined ? {} : { data: toAuthoringDataRef(data) as LayerInput["data"] };
  return {
    geom,
    ...(stat !== undefined && { stat }),
    ...(position !== undefined && { position }),
    ...(positionParams !== undefined && { positionParams }),
    ...(render !== undefined && { render }),
    ...(layerAes !== undefined && { aes: layerAes }),
    ...withData,
    ...(Object.keys(params).length > 0 && { params }),
  } as LayerInput;
}

/**
 * Immutable plot builder core (layer/facet/coord/labs/theme/spec).
 * Geom sugar: WithBuilderGeoms. Scale sugar: WithBuilderScales.
 * Final public class is GGBuilder (builder.ts). Not a public package export.
 */
export class GGBuilderCore {
  readonly #state: BuilderState;

  constructor(state: BuilderState) {
    this.#state = state;
  }

  /**
   * Clone with a state patch. Uses `this.constructor` so the WithBuilderScales
   * subclass (GGBuilder) is preserved across immutable transitions.
   */
  #with(patch: Partial<BuilderState>): GGBuilder {
    return new (this.constructor as new (state: BuilderState) => GGBuilder)({
      ...this.#state,
      ...patch,
    });
  }

  /** Add a layer (canonical form — the geom* methods are sugar for this). */
  layer(layer: LayerInput): GGBuilder {
    // Snapshot authoring data at insertion (same as geom* sugar via layerFrom)
    // so later mutation of caller-owned arrays cannot leak into .spec().
    if (layer.data === undefined) {
      return this.#with({ layers: [...this.#state.layers, layer] });
    }
    // layer.data is AuthoringDataRef at rest; cast through DataInput for snapshot.
    const data: DataInput = layer.data;
    const snapped = { ...layer, data: toAuthoringDataRef(data) } as LayerInput;
    return this.#with({ layers: [...this.#state.layers, snapped] });
  }

  /**
   * Facet into small multiples: wrap form ({ wrap, ncol? }) or grid form
   * ({ rows, cols }). Bare strings are field shorthand. Field objects accept
   * closed `levels` order and a display `labels` map. `strip.position` is
   * top/bottom/left/right (default top); `strip.show: false` hides strip
   * chrome. scales controls per-panel positional-scale freedom ("fixed" default).
   */
  facet(facet: FacetInput): GGBuilder {
    return this.#with({ facet });
  }

  /** Set the coordinate system ("flip" is shorthand for { type: "flip" }). */
  coord(coord: SpecInput["coord"] | "flip"): GGBuilder {
    return this.#with({ coord: coord === "flip" ? { type: "flip" } : coord });
  }

  /** Sugar for .coord("flip") — THE horizontal-composition mechanism. */
  coordFlip(): GGBuilder {
    return this.coord("flip");
  }

  /** Configure a post-stat coordinate transform (distinct from scale transforms). */
  coordTransform(options: CoordTransformOptions = {}): GGBuilder {
    return this.coord(coordTransform(options));
  }

  /** Preserve a physical y-unit/x-unit ratio in the fitted data rectangle. */
  coordFixed(options: CoordFixedOptions = {}): GGBuilder {
    return this.coord(coordFixed(options));
  }

  /** Equal-unit spelling of coordFixed(). */
  coordEqual(options: CoordFixedOptions = {}): GGBuilder {
    return this.coord(coordFixed(options));
  }

  /**
   * Fixed-aspect coordinates for already-projected geom_sf maps (ggplot2
   * coord_sf subset; #809). No CRS reproject in v1.
   */
  coordSf(options: CoordSfOptions = {}): GGBuilder {
    return this.coord(coordSf(options));
  }

  /** Set the accessibility mode ("force-svg" keeps every layer in SVG). */
  a11y(mode: A11yMode): GGBuilder {
    return this.#with({ a11y: mode });
  }

  /** Configure scales (merged per scale over previous calls). */
  scales(scales: Scales): GGBuilder {
    return this.#with({ scales: { ...this.#state.scales, ...scales } });
  }

  /** Configure appearance-only guides (merged per aesthetic over previous calls). */
  guides(guides: GuidesSpec): GGBuilder {
    return this.#with({ guides: { ...this.#state.guides, ...guides } });
  }

  /** Configure the legacy legend entry order (merged over previous calls). */
  legend(legend: LegendSpec): GGBuilder {
    return this.#with({ legend: { ...this.#state.legend, ...legend } });
  }

  /** Set the theme: a registered name or an object with role overrides. */
  theme(theme: ThemeName | ThemeSpec): GGBuilder {
    return this.#with({ theme });
  }

  /** Set human-readable labels (merged over previously set labels). */
  labs(labs: Labs): GGBuilder {
    return this.#with({ labs: { ...this.#state.labs, ...labs } });
  }

  /**
   * Normalize only: channel shorthand, geom defaults, aes inheritance.
   * Does not load TypeBox — the render pipeline runs structural gates; agents
   * that need full schema validation should call {@link spec} (full package)
   * or `validate()` explicitly.
   */
  toPortable(): PortableSpec {
    const {
      data,
      aes: plotAes,
      layers,
      facet,
      coord,
      a11y,
      scales,
      guides,
      legend,
      labs,
      theme,
      width,
      height,
    } = this.#state;
    const calendarFields = calendarDateFields(this.#state);
    const portableLayers = layers.map((layer) => {
      if (layer.data === undefined) return layer;
      // layerFrom stores AuthoringDataRef snapshots as LayerInput.data; portable
      // ISO conversion runs here with the final calendar-date field set.
      return {
        ...layer,
        data: toDataRef(layer.data, calendarFields),
      };
    });
    const input: SpecInput = {
      ...(data !== undefined && { data: toDataRef(data, calendarFields) }),
      ...(plotAes !== undefined && { aes: plotAes }),
      layers: portableLayers,
      ...(facet !== undefined && { facet }),
      ...(coord !== undefined && { coord }),
      ...(a11y !== undefined && { a11y }),
      ...(scales !== undefined && { scales }),
      ...(guides !== undefined && { guides }),
      ...(legend !== undefined && { legend }),
      ...(labs !== undefined && { labs }),
      ...(theme !== undefined && { theme }),
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
    };
    return normalize(input);
  }
}
