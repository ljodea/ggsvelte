/**
 * normalize() freqpoly alias (#796): freqpoly → line + stat bin + identity.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "../src/builder.ts";
import { normalize } from "../src/normalize.ts";
import type { SpecInput } from "../src/normalize.ts";

describe("normalize — geom freqpoly (#796)", () => {
  it("canonicalizes freqpoly → line + bin + identity (+ y count)", () => {
    const spec = normalize({
      layers: [{ geom: "freqpoly", aes: { x: "v" }, params: { binwidth: 0.5, boundary: 0 } }],
    });
    expect(spec.layers[0]).toEqual({
      geom: "line",
      stat: "bin",
      position: "identity",
      aes: { x: { field: "v" }, y: { stat: "count" } },
      params: { binwidth: 0.5, boundary: 0 },
    });
    expect(normalize(spec as SpecInput)).toEqual(spec);
  });

  it("keeps explicit freqpoly y = { stat: 'density' }", () => {
    const spec = normalize({
      layers: [{ geom: "freqpoly", aes: { x: "v", y: { stat: "density" } } }],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "line",
      stat: "bin",
      position: "identity",
      aes: { y: { stat: "density" } },
    });
  });
});

describe("gg builder — geomFreqpoly (#796)", () => {
  it("geomFreqpoly compiles to line + bin", () => {
    const spec = gg({ v: [1, 2, 3] }, aes({ x: "v" }))
      .geomFreqpoly({ binwidth: 1, linewidth: 1.2 })
      .spec();
    expect(spec.layers[0]).toEqual({
      geom: "line",
      stat: "bin",
      position: "identity",
      aes: { x: { field: "v" }, y: { stat: "count" } },
      params: { binwidth: 1, linewidth: 1.2 },
    });
  });
});
