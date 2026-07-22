/**
 * normalize() M2 statistical-layer canonicalization (histogram alias, geom defaults).
 * Core channel/aes/theme coverage: normalize.test.ts.
 */
import { describe, expect, it } from "bun:test";

import { normalize } from "../src/normalize.ts";

describe("normalize — M2 statistical layer", () => {
  it("canonicalizes the histogram alias to bar + stat bin (+ stack, + y stat count)", () => {
    const spec = normalize({
      layers: [{ geom: "histogram", aes: { x: "v" }, params: { binwidth: 0.5, boundary: 0 } }],
    });
    expect(spec.layers[0]).toEqual({
      geom: "bar",
      stat: "bin",
      position: "stack",
      aes: { x: { field: "v" }, y: { stat: "count" } },
      params: { binwidth: 0.5, boundary: 0 },
    });
    expect(normalize(spec as SpecInput)).toEqual(spec);
  });

  it("keeps an explicit histogram y = { stat: 'density' }", () => {
    const spec = normalize({
      layers: [{ geom: "histogram", aes: { x: "v", y: { stat: "density" } } }],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "bar",
      stat: "bin",
      aes: { y: { stat: "density" } },
    });
  });

  it("fills geom defaults: smooth/boxplot/density/errorbar", () => {
    const spec = normalize({
      aes: { x: "x", y: "y" },
      layers: [
        { geom: "smooth" },
        { geom: "boxplot" },
        { geom: "density", aes: { y: null } },
        { geom: "errorbar", stat: "summary" },
      ],
    });
    expect(spec.layers[0]).toMatchObject({ stat: "smooth", position: "identity" });
    expect(spec.layers[1]).toMatchObject({ stat: "boxplot", position: "dodge" });
    expect(spec.layers[2]).toMatchObject({
      stat: "density",
      position: "identity",
      aes: { x: { field: "x" }, y: { stat: "density" } },
    });
    expect(spec.layers[3]).toMatchObject({ stat: "summary", position: "identity" });
    expect(normalize(spec as SpecInput)).toEqual(spec);
  });

  it("canonicalizes ymin/ymax channel shorthand and preserves positionParams", () => {
    const spec = normalize({
      layers: [
        { geom: "errorbar", aes: { x: "g", ymin: "lo", ymax: "hi" } },
        {
          geom: "point",
          aes: { x: "x", y: "y" },
          position: "jitter",
          positionParams: { seed: 7, width: 0.2 },
        },
      ],
    });
    expect(spec.layers[0]).toMatchObject({
      aes: { ymin: { field: "lo" }, ymax: { field: "hi" } },
    });
    expect(spec.layers[1]).toMatchObject({
      position: "jitter",
      positionParams: { seed: 7, width: 0.2 },
    });
    expect(normalize(spec as SpecInput)).toEqual(spec);
  });
});
