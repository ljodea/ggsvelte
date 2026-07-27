/**
 * normalize() defaults for geom blank (#791).
 */
import { describe, expect, it } from "bun:test";

import { normalize } from "../src/normalize.ts";
import type { SpecInput } from "../src/normalize.ts";
import { aes, gg } from "../src/builder.ts";

describe("normalize — geom blank (#791)", () => {
  it("fills blank defaults identity/identity and keeps the geom name", () => {
    const spec = normalize({
      layers: [{ geom: "blank", aes: { x: "x", y: "y" } }],
    });
    expect(spec.layers[0]).toEqual({
      geom: "blank",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "x" }, y: { field: "y" } },
    });
    expect(normalize(spec as SpecInput)).toEqual(spec);
  });

  it("allows blank with no mapped channels", () => {
    const spec = normalize({ layers: [{ geom: "blank" }] });
    expect(spec.layers[0]).toEqual({
      geom: "blank",
      stat: "identity",
      position: "identity",
    });
  });
});

describe("gg builder — geomBlank (#791)", () => {
  it("geomBlank compiles to a blank identity layer", () => {
    const spec = gg({ x: [1], y: [2] }, aes({ x: "x", y: "y" }))
      .geomBlank()
      .spec();
    expect(spec.layers[0]).toEqual({
      geom: "blank",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "x" }, y: { field: "y" } },
    });
  });
});
