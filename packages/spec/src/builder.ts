/**
 * The fluent builder — one of the three surfaces that compile to the same
 * PortableSpec (spec-first design; builder and Svelte components are sugar).
 *
 * - `gg(data, aes(...))` returns an immutable builder: every method returns a
 *   NEW builder (the spec is the explicit first-class value — Hadley lesson 1;
 *   no `+` operator, no mutation).
 * - `.layer({ geom, ... })` is the canonical method (one layer concept —
 *   Hadley lesson 2); `.geomPoint()` / `.geomBar()` / ... are documented
 *   sugar for it.
 * - `.spec()` normalizes and VALIDATES, returning a canonical PortableSpec or
 *   throwing SpecValidationError. Builder output therefore always validates
 *   against the published JSON Schema (property-tested).
 */
import { SpecValidationError } from "./errors.js";
import type { AesInput, FacetInput, LayerInput, SpecInput } from "./normalize.js";
import { normalize } from "./normalize.js";
import {
  scaleXDate,
  scaleXDatetime,
  scaleXDiscrete,
  scaleYDate,
  scaleYDatetime,
  scaleYDiscrete,
  type DiscretePositionScaleOptions,
  type TemporalScaleOptions,
} from "./scale-helpers.js";
import type {
  A11yMode,
  AreaParams,
  BarParams,
  BoxplotParams,
  CellValue,
  ColParams,
  DataRef,
  DensityParams,
  ErrorbarParams,
  Labs,
  LegendSpec,
  LineParams,
  PointParams,
  PointPosition,
  PortableSpec,
  PositionParams,
  RenderBackend,
  RuleParams,
  Scales,
  SmoothParams,
  StackablePosition,
  TextParams,
  ThemeName,
  ThemeSpec,
} from "./schema.js";
import { validate } from "./validate.js";

/**
 * Identity helper for aesthetic mappings, mirroring ggplot2's aes(). Accepts
 * the bare-string shorthand ('displ' means { field: 'displ' }); the shorthand
 * is canonicalized away by normalize() and never reaches the JSON Schema.
 */
export function aes(mapping: AesInput): AesInput {
  return mapping;
}

/** A builder/Svelte data cell. Dates canonicalize to ISO before validation. */
export type AuthoringCellValue = CellValue | Date;
export type AuthoringRows = readonly Readonly<Record<string, AuthoringCellValue>>[];
export type AuthoringColumns = Readonly<Record<string, readonly AuthoringCellValue[]>>;
export type AuthoringDataRef =
  | { values: AuthoringRows }
  | { columns: AuthoringColumns }
  | { name: string };

/** Data accepted by gg(): authoring rows, columns, or a data reference. */
export type DataInput = AuthoringRows | AuthoringColumns | AuthoringDataRef;

function isDataRef(data: DataInput): data is AuthoringDataRef {
  if (Array.isArray(data)) return false;
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

function portableCell(value: AuthoringCellValue): CellValue {
  return value instanceof Date ? value.toISOString() : value;
}

function portableRows(rows: AuthoringRows): Record<string, CellValue>[] {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, portableCell(value)])),
  );
}

function portableColumns(columns: AuthoringColumns): Record<string, CellValue[]> {
  return Object.fromEntries(
    Object.entries(columns).map(([key, values]) => [
      key,
      values.map((value) => portableCell(value)),
    ]),
  );
}

function toDataRef(data: DataInput): DataRef {
  if (Array.isArray(data)) return { values: portableRows(data as AuthoringRows) };
  if (isDataRef(data)) {
    if ("name" in data) return data;
    if ("values" in data) return { values: portableRows(data.values) };
    return { columns: portableColumns(data.columns) };
  }
  return { columns: portableColumns(data as AuthoringColumns) };
}

/** Point-layer sugar options: params plus aes and position (jitter/nudge). */
export interface GeomPointOptions extends PointParams {
  aes?: AesInput;
  render?: RenderBackend;
  position?: PointPosition;
  positionParams?: PositionParams;
}

/** Line-layer sugar options: params plus an optional layer-level aes. */
export interface GeomLineOptions extends LineParams {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Col-layer sugar options: params plus aes and a position override. */
export interface GeomColOptions extends ColParams {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
}

/** Bar-layer sugar options: params plus aes and a position override. */
export interface GeomBarOptions extends BarParams {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
}

/** Histogram-layer sugar options: bin params plus aes and a position override. */
export interface GeomHistogramOptions extends BarParams {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
}

/** Smooth-layer sugar options: params plus an optional layer-level aes. */
export interface GeomSmoothOptions extends SmoothParams {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Boxplot-layer sugar options: params plus aes and a position override. */
export interface GeomBoxplotOptions extends BoxplotParams {
  aes?: AesInput;
  render?: RenderBackend;
  position?: "dodge" | "identity";
}

/** Density-layer sugar options: params plus an optional layer-level aes. */
export interface GeomDensityOptions extends DensityParams {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Errorbar-layer sugar options: params plus aes and a stat override. */
export interface GeomErrorbarOptions extends ErrorbarParams {
  aes?: AesInput;
  render?: RenderBackend;
  stat?: "identity" | "summary";
}

/** Area-layer sugar options: params plus aes and a position override. */
export interface GeomAreaOptions extends AreaParams {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
}

/** Rule-layer sugar options: params (incl. annotation intercepts) plus aes. */
export interface GeomRuleOptions extends RuleParams {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Text-layer sugar options: params plus an optional layer-level aes. */
export interface GeomTextOptions extends TextParams {
  aes?: AesInput;
  render?: RenderBackend;
}

interface BuilderState {
  readonly data?: DataRef;
  readonly aes?: AesInput;
  readonly layers: readonly LayerInput[];
  readonly facet?: FacetInput;
  readonly coord?: SpecInput["coord"];
  readonly a11y?: A11yMode;
  readonly scales?: Scales;
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

/** Immutable plot builder. Construct with gg(); finish with .spec(). */
export class GGBuilder {
  readonly #state: BuilderState;

  constructor(state: BuilderState) {
    this.#state = state;
  }

  #with(patch: Partial<BuilderState>): GGBuilder {
    return new GGBuilder({ ...this.#state, ...patch });
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

  /** Set the accessibility mode ("force-svg" keeps every layer in SVG). */
  a11y(mode: A11yMode): GGBuilder {
    return this.#with({ a11y: mode });
  }

  /** Configure scales (merged per scale over previous calls). */
  scales(scales: Scales): GGBuilder {
    return this.#with({ scales: { ...this.#state.scales, ...scales } });
  }

  /** Configure the x scale as calendar dates. */
  scaleXDate(options: TemporalScaleOptions = {}): GGBuilder {
    return this.scales(scaleXDate(options));
  }

  /** Configure the x scale as date-time instants. */
  scaleXDatetime(options: TemporalScaleOptions = {}): GGBuilder {
    return this.scales(scaleXDatetime(options));
  }

  /** Configure the y scale as calendar dates. */
  scaleYDate(options: TemporalScaleOptions = {}): GGBuilder {
    return this.scales(scaleYDate(options));
  }

  /** Configure the y scale as date-time instants. */
  scaleYDatetime(options: TemporalScaleOptions = {}): GGBuilder {
    return this.scales(scaleYDatetime(options));
  }

  /** Force x values to remain discrete categories. */
  scaleXDiscrete(options: DiscretePositionScaleOptions = {}): GGBuilder {
    return this.scales(scaleXDiscrete(options));
  }

  /** Force y values to remain discrete categories. */
  scaleYDiscrete(options: DiscretePositionScaleOptions = {}): GGBuilder {
    return this.scales(scaleYDiscrete(options));
  }

  /** Configure the legend (merged over previous calls). */
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
      legend,
      labs,
      theme,
      width,
      height,
    } = this.#state;
    const input: SpecInput = {
      ...(data !== undefined && { data }),
      ...(plotAes !== undefined && { aes: plotAes }),
      layers: [...layers],
      ...(facet !== undefined && { facet }),
      ...(coord !== undefined && { coord }),
      ...(a11y !== undefined && { a11y }),
      ...(scales !== undefined && { scales }),
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

/** Start a plot: gg(data, aes({ x: 'displ', y: 'hwy' })).geomPoint().spec(). */
export function gg(data?: DataInput, mapping?: AesInput): GGBuilder {
  return new GGBuilder({
    ...(data !== undefined && { data: toDataRef(data) }),
    ...(mapping !== undefined && { aes: mapping }),
    layers: [],
  });
}
