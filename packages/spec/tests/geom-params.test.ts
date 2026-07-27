/**
 * GEOM_PARAM_KEYS (#1039): param-key whitelist derived once from SpecDeclarations.
 */
import { describe, expect, it } from "bun:test";

import { KNOWN_GEOMS } from "../src/schema-catalog.ts";
import { GEOM_PARAM_KEYS } from "../src/geom-params.ts";

/** Hand-written shell arrays captured before generation (migration guard M4). */
const PRE_GENERATION_SHELL_KEYS = {
  freqpoly: ["alpha", "linewidth", "curve", "bins", "binwidth", "boundary", "center", "closed"],
  rule: ["xintercept", "yintercept", "alpha", "linewidth"],
  text: ["alpha", "size", "anchor", "dx", "dy"],
  segment: ["alpha", "linewidth", "lineend"],
  boxplot: ["width", "coef", "linewidth", "outlierSize", "alpha"],
  violin: [
    "bw",
    "adjust",
    "n",
    "trim",
    "scale",
    "width",
    "alpha",
    "linewidth",
    "fillPaint",
    "strokePaint",
    "glow",
  ],
  map: ["map", "mapId", "alpha", "linewidth", "fillPaint", "strokePaint", "glow"],
  point: [
    "alpha",
    "size",
    "shape",
    "bins",
    "binwidth",
    "boundary",
    "center",
    "closed",
    "fun",
    "funMin",
    "funMax",
  ],
  histogram: ["alpha", "width", "bins", "binwidth", "boundary", "center", "closed"],
  blank: [] as string[],
  col: ["alpha", "width"],
  abline: ["slope", "intercept", "alpha", "linewidth"],
  area: ["alpha"],
  sf: ["geometry", "alpha", "linewidth", "size", "fillPaint", "strokePaint", "glow"],
  quantile: ["quantiles", "n", "linewidth", "alpha", "strokePaint", "glow"],
  function: ["fun", "n", "xlim", "args", "alpha", "linewidth", "strokePaint", "glow"],
  bin_2d: ["bins", "binwidth", "drop", "alpha", "linewidth"],
  crossbar: ["width", "fatten", "linewidth", "alpha", "fun", "funMin", "funMax"],
  curve: ["curvature", "angle", "ncp", "alpha", "linewidth", "lineend"],
  hex: ["bins", "drop", "alpha", "linewidth"],
  errorbar: [
    "width",
    "linewidth",
    "alpha",
    "fun",
    "funMin",
    "funMax",
    "bins",
    "binwidth",
    "boundary",
    "center",
    "closed",
  ],
  smooth: ["method", "se", "level", "span", "degree", "n", "linewidth", "alpha"],
  pointrange: ["linewidth", "alpha", "size", "shape", "fun", "funMin", "funMax"],
  qq_line: ["alpha", "linewidth"],
  density: ["bw", "adjust", "n", "cut", "alpha"],
  dotplot: [
    "bins",
    "binwidth",
    "boundary",
    "center",
    "closed",
    "stackdir",
    "stackratio",
    "dotsize",
    "size",
    "alpha",
    "shape",
  ],
  qq: ["alpha", "size", "shape"],
  polygon: ["alpha", "linewidth", "fillPaint", "strokePaint", "glow"],
  density_2d: ["h", "adjust", "n", "bins", "binwidth", "breaks", "linewidth", "alpha"],
  density_2d_filled: ["h", "adjust", "n", "bins", "binwidth", "breaks", "linewidth", "alpha"],
  tile: ["width", "height", "alpha", "linewidth"],
  rect: ["alpha", "linewidth"],
  rug: ["alpha", "linewidth", "sides", "length"],
  count: ["alpha", "size", "shape"],
  vline: ["xintercept", "alpha", "linewidth"],
  hline: ["yintercept", "alpha", "linewidth"],
  step: ["alpha", "linewidth", "direction"],
  line: [
    "alpha",
    "linewidth",
    "curve",
    "pad",
    "n",
    "bins",
    "binwidth",
    "boundary",
    "center",
    "closed",
    "connection",
    "fun",
    "funMin",
    "funMax",
  ],
  spoke: ["angle", "radius", "alpha", "linewidth", "lineend"],
  raster: ["alpha", "hjust", "vjust", "interpolate"],
  label: ["alpha", "size", "anchor", "dx", "dy", "padding", "radius", "linewidth"],
  contour: ["bins", "binwidth", "breaks", "linewidth", "alpha"],
  linerange: ["width", "linewidth", "alpha", "fun", "funMin", "funMax"],
  sf_label: ["geometry", "alpha", "size", "anchor", "dx", "dy", "padding", "radius", "linewidth"],
  ribbon: ["alpha", "linewidth", "outline", "orientation", "lineend", "linejoin"],
  path: ["alpha", "linewidth", "curve", "connection", "fun"],
  bar: ["alpha", "width"],
  sf_text: ["geometry", "alpha", "size", "anchor", "dx", "dy"],
  jitter: ["alpha", "size", "shape"],
} as const satisfies Record<(typeof KNOWN_GEOMS)[number], readonly string[]>;

describe("GEOM_PARAM_KEYS", () => {
  it("has an entry for every KNOWN_GEOMS name", () => {
    for (const geom of KNOWN_GEOMS) {
      expect(GEOM_PARAM_KEYS[geom], geom).toBeDefined();
      expect(Array.isArray(GEOM_PARAM_KEYS[geom]), geom).toBe(true);
    }
    expect(Object.keys(GEOM_PARAM_KEYS).toSorted()).toEqual([...KNOWN_GEOMS].toSorted());
  });

  it("hex keys match SpecDeclarations.HexParams properties (order-stable)", () => {
    expect([...GEOM_PARAM_KEYS.hex]).toEqual(["bins", "drop", "alpha", "linewidth"]);
  });

  it("violin keys include paint/glow fields from the schema", () => {
    expect([...GEOM_PARAM_KEYS.violin]).toEqual([
      "bw",
      "adjust",
      "n",
      "trim",
      "scale",
      "width",
      "alpha",
      "linewidth",
      "fillPaint",
      "strokePaint",
      "glow",
    ]);
  });

  it("linerange resolves Type.Ref(ErrorbarParams) and is non-empty", () => {
    expect(GEOM_PARAM_KEYS.linerange.length).toBeGreaterThan(0);
    expect([...GEOM_PARAM_KEYS.linerange]).toEqual([
      "width",
      "linewidth",
      "alpha",
      "fun",
      "funMin",
      "funMax",
      "bins",
      "binwidth",
      "boundary",
      "center",
      "closed",
    ]);
  });

  it("blank has an empty key list (BlankParams is {})", () => {
    expect([...GEOM_PARAM_KEYS.blank]).toEqual([]);
  });

  it("pre-generation shell keys are a subset of derived keys (no silent loss)", () => {
    for (const geom of KNOWN_GEOMS) {
      const derived = new Set(GEOM_PARAM_KEYS[geom]);
      for (const key of PRE_GENERATION_SHELL_KEYS[geom]) {
        expect(derived.has(key), `${geom} lost hand-written key ${key}`).toBe(true);
      }
    }
  });
});
