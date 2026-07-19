/**
 * normalize() — the canonicalizer (plan: "One canonical form per concept").
 *
 * Input: a SpecInput, the TS/builder-level convenience form where channels may
 * be bare strings ('displ' means { field: 'displ' }). The JSON Schema does NOT
 * admit bare strings — the shorthand exists only here and in the Svelte props.
 * Input types live in normalize-input.ts.
 *
 * Output: a canonical PortableSpec. Canonicalization performed:
 *  1. Bare-string channels -> { field } (in plot aes and layer aes).
 *  2. Geom defaults filled (GEOM_DEFAULTS): bar -> stat count + position
 *     stack; col/area -> identity + stack; everything else identity/identity.
 *  3. Bar layers with no y channel get the count stat's default mapping
 *     y: { stat: "count" } (ggplot2's after_stat default aes).
 *  4. Aes inheritance RESOLVED into each layer with null-unset semantics
 *     (layer channel null removes the inherited channel), and the plot-level
 *     `aes` removed from the output. Every normalized layer is self-contained.
 *     (Resolving at normalize time is what makes normalize idempotent: keeping
 *     plot aes AND merged layers would re-inherit null-unset channels on a
 *     second pass.)
 *  5. Theme names stay strings; theme objects are cloned (both canonical).
 *  6. Deterministic key order for every object it constructs.
 *
 * Scale-type inference needs data, so it lives in @ggsvelte/core (pipeline);
 * normalize only fills structural defaults. Normalized output is itself a
 * valid PortableSpec, and normalize(normalize(s)) deep-equals normalize(s).
 */
import type {
  Aes,
  ChannelValue,
  ColorScaleSpec,
  FacetSpec,
  LayerSpec,
  PortableSpec,
  Scales,
  ThemeName,
  ThemeSpec,
} from "./schema.js";
import { CHANNELS, CURRENT_EDITION, GEOM_DEFAULTS } from "./schema.js";
import type {
  AesInput,
  ChannelInput,
  FacetInput,
  LayerInput,
  SpecInput,
} from "./normalize-input.js";

// Stable public path: re-export input types so index/builder/tests keep
// importing from ./normalize.js (type-only dependency on normalize-input).
export type {
  AesInput,
  AreaLayerInput,
  BarLayerInput,
  BoxplotLayerInput,
  ChannelInput,
  ColLayerInput,
  DensityLayerInput,
  ErrorbarLayerInput,
  FacetInput,
  HistogramLayerInput,
  LayerInput,
  LineLayerInput,
  PointLayerInput,
  RuleLayerInput,
  SmoothLayerInput,
  SpecInput,
  TextLayerInput,
} from "./normalize-input.js";

/** Canonicalize one channel: bare string -> { field }; clone canonical forms. */
export function normalizeChannel(input: ChannelInput): ChannelValue {
  if (typeof input === "string") return { field: input };
  if (input === null) return null;
  if ("field" in input) return { field: input.field };
  if ("value" in input) {
    return input.scale === undefined
      ? { value: input.value }
      : { value: input.value, scale: input.scale };
  }
  return { stat: input.stat };
}

function normalizeAes(input: AesInput | undefined): Aes | undefined {
  if (input === undefined) return undefined;
  const out: Record<string, ChannelValue> = {};
  for (const channel of CHANNELS) {
    const v = input[channel];
    if (v === undefined) continue;
    out[channel] = normalizeChannel(v);
  }
  return out;
}

/**
 * Merge plot-level aes into a layer's aes with null-unset semantics:
 * layer channels override; a layer channel of null REMOVES the inherited
 * channel (and does not survive into the resolved mapping).
 */
function resolveLayerAes(plotAes: Aes | undefined, layerAes: Aes | undefined): Aes | undefined {
  const out: Record<string, ChannelValue> = {};
  for (const channel of CHANNELS) {
    const own = layerAes?.[channel];
    if (own === null) continue; // explicit unset
    const inherited = plotAes?.[channel];
    const chosen = own ?? inherited;
    if (chosen === undefined || chosen === null) continue;
    out[channel] = chosen;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

/** Annotation-form rule layers (fixed intercepts) inherit NO plot aes —
 *  ggplot2's `inherit.aes = FALSE` on geom_vline/hline (Hadley lesson 15:
 *  honest, separate signatures for the two rule forms). */
function isAnnotationRule(layer: LayerInput): boolean {
  if (layer.geom !== "rule") return false;
  const params = layer.params;
  return params?.xintercept !== undefined || params?.yintercept !== undefined;
}

function normalizeLayer(layer: LayerInput, plotAes: Aes | undefined): LayerSpec {
  const inherited = isAnnotationRule(layer) ? undefined : plotAes;
  let aes = resolveLayerAes(inherited, normalizeAes(layer.aes));
  // Unknown geoms fall back to identity defaults so normalize never throws —
  // validate() rejects them right after with the proper did-you-mean error.
  const defaults = GEOM_DEFAULTS[layer.geom] ?? { stat: "identity", position: "identity" };
  const stat = layer.stat ?? defaults.stat;
  // Stat default mappings (ggplot2's `after_stat()` default aes): the count
  // and bin stats map y to their count column; the density stat maps y to
  // its density column.
  if ((stat === "count" || stat === "bin") && aes?.y === undefined) {
    aes = { ...aes, y: { stat: "count" } };
  }
  if (stat === "density" && aes?.y === undefined) {
    aes = { ...aes, y: { stat: "density" } };
  }
  // The histogram geom is an ALIAS (one canonical form per concept): its
  // post-normalize representation is a bar layer with the bin stat.
  const geom = layer.geom === "histogram" ? "bar" : layer.geom;
  const positionParams =
    "positionParams" in layer && layer.positionParams !== undefined
      ? { ...layer.positionParams }
      : undefined;
  const params = layer.params === undefined ? undefined : { ...layer.params };
  // "auto" is the render default — one canonical form per concept, so it
  // canonicalizes away (same rule as coord "cartesian" / a11y "auto").
  const render = layer.render === "auto" ? undefined : layer.render;
  const out = {
    geom,
    stat,
    position: layer.position ?? defaults.position,
    ...(positionParams !== undefined && { positionParams }),
    ...(render !== undefined && { render }),
    ...(aes !== undefined && { aes }),
    ...(params !== undefined && { params }),
  };
  return out as LayerSpec;
}

const fieldRef = (v: string | { field: string } | undefined) =>
  v === undefined ? undefined : typeof v === "string" ? { field: v } : { field: v.field };

/** Canonicalize a facet input: bare-string fields -> { field }. */
function normalizeFacet(facet: FacetInput): FacetSpec {
  const wrap = fieldRef(facet.wrap);
  const rows = fieldRef(facet.rows);
  const cols = fieldRef(facet.cols);
  return {
    ...(wrap !== undefined && { wrap }),
    ...(rows !== undefined && { rows }),
    ...(cols !== undefined && { cols }),
    ...(facet.ncol !== undefined && { ncol: facet.ncol }),
    ...(facet.scales !== undefined && { scales: facet.scales }),
  };
}

function normalizeTheme(theme: ThemeName | ThemeSpec): ThemeName | ThemeSpec {
  return typeof theme === "string" ? theme : { ...theme };
}

function normalizeHexColor(color: string): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (match === null) return color;
  const digits = match[1]!.toLowerCase();
  return digits.length === 3
    ? `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`
    : `#${digits}`;
}

function normalizeColorScale(scale: ColorScaleSpec): ColorScaleSpec {
  return {
    ...scale,
    ...(scale.range !== undefined && { range: scale.range.map(normalizeHexColor) }),
  };
}

function normalizeScales(scales: Scales): Scales {
  return {
    ...(scales.x !== undefined && { x: { ...scales.x } }),
    ...(scales.y !== undefined && { y: { ...scales.y } }),
    ...(scales.color !== undefined && { color: normalizeColorScale(scales.color) }),
    ...(scales.fill !== undefined && { fill: normalizeColorScale(scales.fill) }),
  };
}

/** Canonicalize a SpecInput into a normalized PortableSpec (see module docs). */
export function normalize(input: SpecInput): PortableSpec {
  const plotAes = normalizeAes(input.aes);
  // Defaults canonicalize away: coord "cartesian" and a11y "auto" ARE the
  // absent forms (one canonical form per concept).
  const coord = input.coord?.type === "flip" ? { type: "flip" as const } : undefined;
  const a11y = input.a11y === "force-svg" ? input.a11y : undefined;
  const out: PortableSpec = {
    ...(input.$schema !== undefined && { $schema: input.$schema }),
    // Defaults-edition stamping (Hadley lesson 13): absent -> current, so the
    // spec's default look is frozen at authoring time (schema description).
    edition: input.edition ?? CURRENT_EDITION,
    ...(input.data !== undefined && { data: input.data }),
    ...(input.datasets !== undefined && { datasets: input.datasets }),
    layers: input.layers.map((layer) => normalizeLayer(layer, plotAes)),
    ...(input.facet !== undefined && { facet: normalizeFacet(input.facet) }),
    ...(coord !== undefined && { coord }),
    ...(input.scales !== undefined && { scales: normalizeScales(input.scales) }),
    ...(input.legend !== undefined && { legend: { ...input.legend } }),
    ...(input.labs !== undefined && { labs: { ...input.labs } }),
    ...(input.theme !== undefined && { theme: normalizeTheme(input.theme) }),
    ...(input.width !== undefined && { width: input.width }),
    ...(input.height !== undefined && { height: input.height }),
    ...(a11y !== undefined && { a11y }),
  };
  return out;
}
