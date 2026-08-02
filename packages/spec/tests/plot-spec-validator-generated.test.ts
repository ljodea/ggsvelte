import { describe, expect, it } from "bun:test";
import Compile from "typebox/compile";
import { Settings } from "typebox/system";

// @ts-expect-error generated emit is untyped
import { Check } from "../src/generated/plot-spec-validator.ts";
import { PlotSpecSchema } from "../src/schema.ts";

/**
 * The precompiled PlotSpecSchema validator (scripts/gen-plot-validator.ts)
 * must agree with a runtime-compiled validator on every input — the gen
 * script embeds the same schema compiled under the same
 * exactOptionalPropertyTypes setting, so drift means the artifact is stale
 * OR TypeBox's Code() and Compile() disagree (both release-blocking).
 */
function runtimeCompiled(): { Check(value: unknown): boolean } {
  const previousExactOptional = Settings.Get().exactOptionalPropertyTypes;
  Settings.Set({ exactOptionalPropertyTypes: true });
  try {
    return Compile(PlotSpecSchema);
  } finally {
    Settings.Set({ exactOptionalPropertyTypes: previousExactOptional });
  }
}

function corpus(): unknown[] {
  const specs: unknown[] = [
    // Broadly-invalid shapes.
    null,
    undefined,
    0,
    "spec",
    [],
    {},
    { layers: [] },
    { layers: [{}] },
    // Minimal valid point plot (data values form).
    {
      data: { values: [{ x: 1, y: 2 }] },
      layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
    },
    // Columns data form + several geoms/params shapes.
    {
      data: { columns: { x: [1, 2], y: [3, 4], g: ["a", "b"] } },
      aes: { x: "x", y: "y", fill: "g" },
      layers: [
        { geom: "col", position: "stack" },
        { geom: "line", params: { linewidth: 2, curve: "step" } },
        { geom: "area", params: { alpha: 0.5 } },
      ],
      scales: {
        x: { type: "linear", domain: [0, 10], breaks: [0, 5, 10], labels: ",.2f" },
        y: { type: "log", transform: "log10" },
        fill: { type: "categorical", scheme: "tableau10" },
      },
      coord: { type: "fixed", ratio: 1.5 },
      facet: { type: "wrap", facets: "g", ncol: 2 },
      labs: { title: "t", x: "X", y: "Y" },
      guides: { x: { type: "axis" } },
      legend: { position: "right" },
      width: 640,
      height: 400,
      a11y: "auto",
    },
    // Temporal + styles + rules + annotation rule forms.
    {
      data: { columns: { when: ["2024-01-01", "2024-02-01"], v: [1, 2] } },
      layers: [
        { geom: "smooth", aes: { x: "when", y: "v" }, params: { method: "loess", span: 0.5 } },
        { geom: "density", aes: { x: "v" }, params: { n: 128, bw: 0.3 } },
        { geom: "vline", params: { xintercept: 1.5 } },
        { geom: "hline", params: { yintercept: 2 } },
        { geom: "rule", aes: { yintercept: "v" } },
      ],
      scales: {
        x: { type: "time", temporalKind: "date", timezone: "UTC", dateBreaks: "1 month" },
        size: { type: "sequential", range: [1, 6] },
        alpha: { type: "binned", breaks: [0, 0.5, 1] },
        shape: { type: "ordinal" },
      },
    },
    // Every near-miss: required channel missing, wrong types, extra keys,
    // out-of-range numbers, bad enum values, optional keys present-but-
    // undefined (exactOptionalPropertyTypes must reject).
    { layers: [{ geom: "point" }] },
    {
      data: { values: [{ x: 1, y: 2 }] },
      layers: [{ geom: "point", aes: { x: "x", y: "y" }, bogus: true }],
    },
    {
      data: { values: [{ x: 1, y: 2 }] },
      layers: [{ geom: "point", aes: { x: "x", y: "y" }, params: { size: -1 } }],
    },
    {
      data: { values: [{ x: 1, y: 2 }] },
      layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
      width: 640,
      height: undefined,
    },
    {
      data: { values: [{ x: 1, y: 2 }] },
      layers: [{ geom: "nosuchgeom", aes: { x: "x", y: "y" } }],
    },
    // Deeply nested facet/coord combos.
    {
      data: { columns: { x: [1], y: [2], a: ["u"], b: ["v"] } },
      layers: [{ geom: "tile", aes: { x: "x", y: "y", fill: "y" } }],
      facet: { type: "grid", rows: "a", cols: "b", scales: "free_x" },
      coord: { type: "transform", x: "log10", y: "sqrt" },
    },
  ];
  return specs;
}

describe("generated plot-spec validator", () => {
  it("agrees with a runtime-compiled validator across the corpus", () => {
    const compiled = runtimeCompiled();
    const generated = Check as (value: unknown) => boolean;
    for (const [index, spec] of corpus().entries()) {
      expect(generated(spec), `corpus[${index}]`).toBe(compiled.Check(spec));
    }
  });

  it("agrees on fuzzed mutations of a valid spec", () => {
    const compiled = runtimeCompiled();
    const generated = Check as (value: unknown) => boolean;
    let state = 19;
    const rnd = () => (state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 500; i++) {
      const spec = {
        data: { values: [{ x: rnd(), y: rnd() }] },
        layers: [
          {
            geom: ["point", "line", "col", "area", "text", "rect", "segment"][i % 7],
            aes: { x: "x", y: "y" },
            params: rnd() < 0.5 ? { alpha: rnd() } : { alpha: rnd() * 2 },
          },
        ],
        width: rnd() < 0.8 ? 640 : -1,
      };
      expect(generated(spec), `fuzz[${i}]`).toBe(compiled.Check(spec));
    }
  });
});
