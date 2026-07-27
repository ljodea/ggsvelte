/**
 * Fluent builder core: state, geom/facet/coord/labs/theme/spec.
 * Scale sugar mixin: builder-scales.ts. Public GGBuilder: builder.ts.
 */
import {
  coordFixed,
  coordSf,
  coordTransform,
  type CoordFixedOptions,
  type CoordSfOptions,
  type CoordTransformOptions,
} from "./coord-helpers.js";
import { SpecValidationError } from "./errors.js";
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
  GeomAreaOptions,
  GeomBarOptions,
  GeomBoxplotOptions,
  GeomColOptions,
  GeomDensityOptions,
  GeomDensity2dOptions,
  GeomDensity2dFilledOptions,
  GeomDotplotOptions,
  GeomErrorbarOptions,
  GeomRibbonOptions,
  GeomHistogramOptions,
  GeomFreqpolyOptions,
  GeomHlineOptions,
  GeomJitterOptions,
  GeomLineOptions,
  GeomPathOptions,
  GeomPointOptions,
  GeomRasterOptions,
  GeomHexOptions,
  GeomRectOptions,
  GeomRuleOptions,
  GeomRugOptions,
  GeomSegmentOptions,
  GeomAblineOptions,
  GeomVlineOptions,
  GeomQuantileOptions,
  GeomCurveOptions,
  GeomContourOptions,
  GeomMapOptions,
  GeomSfOptions,
  GeomSfTextOptions,
  GeomSfLabelOptions,
  GeomBlankOptions,
  GeomSpokeOptions,
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

  /** Sugar for .layer({ geom: 'point', ... }). */
  geomPoint(options: GeomPointOptions = {}): GGBuilder {
    return this.layer(layerFrom("point", options));
  }

  /** Sugar for .layer({ geom: 'line', ... }). */
  geomLine(options: GeomLineOptions = {}): GGBuilder {
    return this.layer(layerFrom("line", options));
  }

  /** Sugar for .layer({ geom: 'quantile', ... }) — linear QR lines (#805). */
  geomQuantile(options: GeomQuantileOptions = {}): GGBuilder {
    return this.layer(layerFrom("quantile", options));
  }

  /** Sugar for .layer({ geom: 'contour', ... }) — isolines over a z grid (#801). */
  geomContour(options: GeomContourOptions = {}): GGBuilder {
    return this.layer(layerFrom("contour", options));
  }

  /** Sugar for .layer({ geom: 'path', ... }) — connect in data order (#788). */
  geomPath(options: GeomPathOptions = {}): GGBuilder {
    return this.layer(layerFrom("path", options));
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

  /**
   * Sugar for .layer({ geom: 'hline', ... }) — horizontal reference lines
   * (ggplot2 geom_hline; normalize() → rule). Annotation: yintercept.
   */
  geomHline(options: GeomHlineOptions = {}): GGBuilder {
    return this.layer(layerFrom("hline", options));
  }

  /**
   * Sugar for .layer({ geom: 'vline', ... }) — vertical reference lines
   * (ggplot2 geom_vline; normalize() → rule). Annotation: xintercept.
   */
  geomVline(options: GeomVlineOptions = {}): GGBuilder {
    return this.layer(layerFrom("vline", options));
  }

  /**
   * Sugar for .layer({ geom: 'jitter', ... }) — points with position jitter
   * (ggplot2 geom_jitter; normalize() → point + position jitter). Flat
   * width/height/seed are assembled into positionParams here (not by normalize).
   */
  geomJitter(options: GeomJitterOptions = {}): GGBuilder {
    const { width, height, seed, positionParams, ...rest } = options;
    const mergedPositionParams = {
      ...positionParams,
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
      ...(seed !== undefined && { seed }),
    };
    const hasPositionParams = Object.keys(mergedPositionParams).length > 0;
    return this.layer(
      layerFrom("jitter", {
        ...rest,
        ...(hasPositionParams && { positionParams: mergedPositionParams }),
      }),
    );
  }

  /** Sugar for .layer({ geom: 'text', ... }). */
  geomText(options: GeomTextOptions = {}): GGBuilder {
    return this.layer(layerFrom("text", options));
  }

  /** Sugar for .layer({ geom: 'histogram', ... }) — binned bars over continuous x. */
  geomHistogram(options: GeomHistogramOptions = {}): GGBuilder {
    return this.layer(layerFrom("histogram", options));
  }

  /**
   * Sugar for .layer({ geom: 'freqpoly', ... }) — binned frequency polygon
   * (normalize → line + stat bin; ggplot2 geom_freqpoly).
   */
  geomFreqpoly(options: GeomFreqpolyOptions = {}): GGBuilder {
    return this.layer(layerFrom("freqpoly", options));
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

  /** Sugar for .layer({ geom: 'density_2d', ... }) — bivariate KDE isolines (#802). */
  geomDensity2d(options: GeomDensity2dOptions = {}): GGBuilder {
    return this.layer(layerFrom("density_2d", options));
  }

  /** Sugar for .layer({ geom: 'dotplot', ... }) — histodot stacked dots (#803). */
  geomDotplot(options: GeomDotplotOptions = {}): GGBuilder {
    return this.layer(layerFrom("dotplot", options));
  }

  /** Sugar for filled 2D KDE rings (#802 phase 2). */
  geomDensity2dFilled(options: GeomDensity2dFilledOptions = {}): GGBuilder {
    return this.layer(layerFrom("density_2d_filled", options));
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

  /** Sugar for .layer({ geom: 'hex', ... }) — hexagonal 2D bin heatmap. */
  geomHex(options: GeomHexOptions = {}): GGBuilder {
    return this.layer(layerFrom("hex", options));
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
   * Sugar for .layer({ geom: 'abline', ... }). Annotation form: slope and
   * intercept (defaults 1 and 0). Line is clipped to the panel domain.
   */
  geomAbline(options: GeomAblineOptions = {}): GGBuilder {
    return this.layer(layerFrom("abline", options));
  }

  /**
   * Sugar for .layer({ geom: 'curve', ... }) — curved connectors from
   * (x,y) to (xend,yend) (ggplot2 geom_curve).
   */
  geomCurve(options: GeomCurveOptions = {}): GGBuilder {
    return this.layer(layerFrom("curve", options));
  }

  /** Sugar for .layer({ geom: 'map', ... }) — fortified map join (#808). */
  geomMap(options: GeomMapOptions): GGBuilder {
    return this.layer(layerFrom("map", options));
  }

  /** Sugar for .layer({ geom: 'sf', ... }) — portable GeoJSON geometries (#809). */
  geomSf(options: GeomSfOptions = {}): GGBuilder {
    return this.layer(layerFrom("sf", options));
  }

  /** Sugar for .layer({ geom: 'sf_text', ... }) — labels at SF centroids (#809). */
  geomSfText(options: GeomSfTextOptions = {}): GGBuilder {
    return this.layer(layerFrom("sf_text", options));
  }

  /** Sugar for .layer({ geom: 'sf_label', ... }) — boxed labels at SF centroids (#809). */
  geomSfLabel(options: GeomSfLabelOptions = {}): GGBuilder {
    return this.layer(layerFrom("sf_label", options));
  }

  /** Sugar for .layer({ geom: 'spoke', ... }) — origin + angle + radius (#810). */
  geomSpoke(options: GeomSpokeOptions = {}): GGBuilder {
    return this.layer(layerFrom("spoke", options));
  }

  /**
   * Sugar for .layer({ geom: 'blank', ... }) — trains scales from mapped
   * aesthetics without drawing marks (ggplot2 geom_blank).
   */
  geomBlank(options: GeomBlankOptions = {}): GGBuilder {
    return this.layer(layerFrom("blank", options));
  }

  /**
   * Sugar for .layer({ geom: 'rug', ... }). Marginal edge ticks; set
   * params.sides (default "bl") and params.length (panel fraction, default 0.03).
   */
  geomRug(options: GeomRugOptions = {}): GGBuilder {
    return this.layer(layerFrom("rug", options));
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
    const normalized = normalize(input);
    const result = validate(normalized);
    if (!result.ok) throw new SpecValidationError(result.errors);
    return result.spec;
  }
}
