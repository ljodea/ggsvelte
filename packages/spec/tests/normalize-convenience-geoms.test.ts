/**
 * normalize() convenience geom aliases (#818): jitter → point+position jitter,
 * hline/vline → rule (annotation inherit.aes = FALSE when intercepts set).
 * Mirrors the histogram → bar+bin alias pattern in normalize-m2.test.ts.
 */
import { describe, expect, it } from "bun:test";

import { normalize } from "../src/normalize.ts";
import type { SpecInput } from "../src/normalize.ts";

describe("normalize — convenience geom aliases (#818)", () => {
  it("canonicalizes jitter → point + position jitter; keeps positionParams", () => {
    const spec = normalize({
      layers: [
        {
          geom: "jitter",
          aes: { x: "x", y: "y" },
          positionParams: { width: 0.2, height: 0.1, seed: 7 },
          params: { alpha: 0.5, size: 3 },
        },
      ],
    });
    expect(spec.layers[0]).toEqual({
      geom: "point",
      stat: "identity",
      position: "jitter",
      positionParams: { width: 0.2, height: 0.1, seed: 7 },
      aes: { x: { field: "x" }, y: { field: "y" } },
      params: { alpha: 0.5, size: 3 },
    });
    expect(normalize(spec as SpecInput)).toEqual(spec);
  });

  it("fills jitter defaults without positionParams", () => {
    const spec = normalize({
      layers: [{ geom: "jitter", aes: { x: "x", y: "y" } }],
    });
    expect(spec.layers[0]).toEqual({
      geom: "point",
      stat: "identity",
      position: "jitter",
      aes: { x: { field: "x" }, y: { field: "y" } },
    });
  });

  it("canonicalizes hline(yintercept) → rule annotation; strips plot aes inheritance", () => {
    const spec = normalize({
      aes: { x: "x", y: "y", color: "g" },
      layers: [{ geom: "hline", params: { yintercept: 0, linewidth: 1.2 } }],
    });
    expect(spec.layers[0]).toEqual({
      geom: "rule",
      stat: "identity",
      position: "identity",
      params: { yintercept: 0, linewidth: 1.2 },
    });
    expect(normalize(spec as SpecInput)).toEqual(spec);
  });

  it("canonicalizes vline(xintercept) → rule annotation; strips plot aes inheritance", () => {
    const spec = normalize({
      aes: { x: "x", y: "y" },
      layers: [{ geom: "vline", params: { xintercept: 1.5, alpha: 0.4 } }],
    });
    expect(spec.layers[0]).toEqual({
      geom: "rule",
      stat: "identity",
      position: "identity",
      params: { xintercept: 1.5, alpha: 0.4 },
    });
  });

  it("data-driven hline → rule with aes.y; drops inherited x (one-axis rule form)", () => {
    const spec = normalize({
      aes: { x: "x", y: "y", color: "g" },
      layers: [{ geom: "hline", aes: { y: "threshold" } }],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "rule",
      stat: "identity",
      position: "identity",
      aes: {
        y: { field: "threshold" },
        color: { field: "g" },
      },
    });
    expect(spec.layers[0]!.aes).not.toHaveProperty("x");
  });

  it("data-driven vline → rule with aes.x; drops inherited y (one-axis rule form)", () => {
    const spec = normalize({
      aes: { x: "x", y: "y", color: "g" },
      layers: [{ geom: "vline", aes: { x: "cut" } }],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "rule",
      aes: {
        x: { field: "cut" },
        color: { field: "g" },
      },
    });
    expect(spec.layers[0]!.aes).not.toHaveProperty("y");
  });

  it("annotation hline keeps layer-local color value aes (not plot field inheritance)", () => {
    const spec = normalize({
      aes: { x: "x", y: "y", color: "g" },
      layers: [
        {
          geom: "hline",
          aes: { color: { value: "#d14d41" } },
          params: { yintercept: 0 },
        },
      ],
    });
    expect(spec.layers[0]).toEqual({
      geom: "rule",
      stat: "identity",
      position: "identity",
      aes: { color: { value: "#d14d41" } },
      params: { yintercept: 0 },
    });
  });
});
