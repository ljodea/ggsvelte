/**
 * Fluent builder core: state, geom/facet/coord/labs/theme/spec.
 * Scale sugar mixin: builder-scales.ts. Public GGBuilder: builder.ts.
 */
import { coordTransform, type CoordTransformOptions } from "./coord-helpers.js";
import { SpecValidationError } from "./errors.js";
import type { AesInput, FacetInput, LayerInput, SpecInput } from "./normalize.js";
import { normalize } from "./normalize.js";
import { calendarDateFields, toDataRef, type AuthoringDataRef } from "./builder-data.js";
import type {
  GeomAreaOptions,
  GeomBarOptions,
  GeomBoxplotOptions,
  GeomColOptions,
  GeomDensityOptions,
  GeomErrorbarOptions,
  GeomRibbonOptions,
  GeomHistogramOptions,
  GeomLineOptions,
  GeomPointOptions,
  GeomRasterOptions,
  GeomRectOptions,
  GeomRuleOptions,
  GeomSegmentOptions,
  GeomSmoothOptions,
  GeomTextOptions,
  GeomTileOptions,
} from "./builder-options.js";
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
import { validate } from "./validate.js";
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
function layerFrom(
  geom: LayerInput["geom"],
  options: {
    aes?: AesInput;
    render?: RenderBackend;
    position?: string;
    positionParams?: PositionParams;
    stat?: string;
  },
): LayerInput {
  const { aes: layerAes, render, position, positionParams, stat, ...params } = options;
  return {
    geom,
    ...(stat !== undefined && { stat }),
    ...(position !== undefined && { position }),
    ...(positionParams !== undefined && { positionParams }),
    ...(render !== undefined && { render }),
    ...(layerAes !== undefined && { aes: layerAes }),
    ...(Object.keys(params).length > 0 && { params }),
  } as LayerInput;
}

/**
 * Immutable plot builder core (geom/facet/coord/labs/theme/spec).
 * Scale sugar is mixed in via WithBuilderScales — final public class is GGBuilder.
 * Not a public package export; consumed only by builder.ts.
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
    return this.#with({ layers: [...this.#state.layers, layer] });
  }

  /** Sugar for .layer({ geom: 'point', ... }). */
  geomPoint(options: GeomPointOptions = {}): GGBuilder {
    return this.layer(layerFrom("point", options));
  }

  /** Sugar for .layer({ geom: 'line', ... }). */
  geomLine(options: GeomLineOptions = {}): GGBuilder {
    return this.layer(layerFrom("line", options));
  }

  /** Sugar for .layer({ geom: 'col', ... }) — bars from pre-computed heights. */
  geomCol(options: GeomColOptions = {}): GGBuilder {
    return this.layer(layerFrom("col", options));
  }

  /** Sugar for .layer({ geom: 'bar', ... }) — bars counting rows per x. */
  geomBar(options: GeomBarOptions = {}): GGBuilder {
    return this.layer(layerFrom("bar", options));
  }

  /** Sugar for .layer({ geom: 'area', ... }). */
  geomArea(options: GeomAreaOptions = {}): GGBuilder {
    return this.layer(layerFrom("area", options));
  }

  /**
   * Sugar for .layer({ geom: 'rule', ... }). Annotation form: pass
   * xintercept/yintercept. Data-driven form: pass aes with x OR y.
   */
  geomRule(options: GeomRuleOptions = {}): GGBuilder {
    return this.layer(layerFrom("rule", options));
  }

  /** Sugar for .layer({ geom: 'text', ... }). */
  geomText(options: GeomTextOptions = {}): GGBuilder {
    return this.layer(layerFrom("text", options));
  }

  /** Sugar for .layer({ geom: 'histogram', ... }) — binned bars over continuous x. */
  geomHistogram(options: GeomHistogramOptions = {}): GGBuilder {
    return this.layer(layerFrom("histogram", options));
  }

  /** Sugar for .layer({ geom: 'smooth', ... }) — fitted trend + se ribbon. */
  geomSmooth(options: GeomSmoothOptions = {}): GGBuilder {
    return this.layer(layerFrom("smooth", options));
  }

  /** Sugar for .layer({ geom: 'boxplot', ... }). */
  geomBoxplot(options: GeomBoxplotOptions = {}): GGBuilder {
    return this.layer(layerFrom("boxplot", options));
  }

  /** Sugar for .layer({ geom: 'density', ... }) — gaussian KDE area. */
  geomDensity(options: GeomDensityOptions = {}): GGBuilder {
    return this.layer(layerFrom("density", options));
  }

  /**
   * Sugar for .layer({ geom: 'errorbar', ... }). Identity stat: map aes.ymin
   * and aes.ymax. Pass stat: "summary" to compute mean ± se per x group.
   */
  geomErrorbar(options: GeomErrorbarOptions = {}): GGBuilder {
    return this.layer(layerFrom("errorbar", options));
  }

  /** Sugar for .layer({ geom: 'rect', ... }) — arbitrary xmin/xmax/ymin/ymax regions. */
  geomRect(options: GeomRectOptions = {}): GGBuilder {
    return this.layer(layerFrom("rect", options));
  }

  /** Sugar for .layer({ geom: 'tile', ... }) — center-sized cells at x/y. */
  geomTile(options: GeomTileOptions = {}): GGBuilder {
    return this.layer(layerFrom("tile", options));
  }

  /** Sugar for .layer({ geom: 'raster', ... }) — equal-cell dense grid. */
  geomRaster(options: GeomRasterOptions = {}): GGBuilder {
    return this.layer(layerFrom("raster", options));
  }

  /**
   * Sugar for .layer({ geom: 'ribbon', ... }). Map x+ymin+ymax (or y+xmin+xmax
   * for y orientation) to precomputed interval bounds.
   */
  geomRibbon(options: GeomRibbonOptions = {}): GGBuilder {
    return this.layer(layerFrom("ribbon", options));
  }

  /**
   * Sugar for .layer({ geom: 'segment', ... }). Map x, y, xend, and yend for
   * finite two-endpoint lines (leader lines, range ticks, annotations).
   */
  geomSegment(options: GeomSegmentOptions = {}): GGBuilder {
    return this.layer(layerFrom("segment", options));
  }

  /**
   * Facet into small multiples: wrap form ({ wrap, ncol? }) or grid form
   * ({ rows, cols }). Bare strings are field shorthand. scales controls
   * per-panel positional-scale freedom ("fixed" default).
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
   * Compile to a canonical PortableSpec: normalize (canonicalize channel
   * shorthand, fill geom defaults, resolve aes inheritance) then validate.
   * Throws SpecValidationError when the result does not satisfy the schema.
   */
  spec(): PortableSpec {
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
    const input: SpecInput = {
      ...(data !== undefined && { data: toDataRef(data, calendarDateFields(this.#state)) }),
      ...(plotAes !== undefined && { aes: plotAes }),
      layers: [...layers],
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
    const normalized = normalize(input);
    const result = validate(normalized);
    if (!result.ok) throw new SpecValidationError(result.errors);
    return result.spec;
  }
}
