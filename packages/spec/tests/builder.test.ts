import { describe, expect, it } from "bun:test";

import { aes, gg, GGBuilder } from "../src/builder.ts";
import { normalize } from "../src/normalize.ts";
import { SpecValidationError } from "../src/errors.ts";

const rows = [
  { x: 1, y: 2, cls: "a" },
  { x: 2, y: 3, cls: "b" },
];

describe("gg builder", () => {
  it("is immutable: every method returns a new builder", () => {
    const base = gg(rows, aes({ x: "x", y: "y" }));
    const withPoint = base.geomPoint();
    const withLabs = withPoint.labs({ title: "T" });
    expect(withPoint).not.toBe(base);
    expect(withLabs).not.toBe(withPoint);
    // base is untouched: still zero layers -> spec() must fail (minItems 1)
    expect(() => base.spec()).toThrow(SpecValidationError);
    expect(withPoint.spec().layers).toHaveLength(1);
  });

  it("preserves GGBuilder identity across geom and scale sugar chains", () => {
    const base = gg(rows, aes({ x: "x", y: "y" }));
    expect(base).toBeInstanceOf(GGBuilder);
    const withPoint = base.geomPoint();
    expect(withPoint).toBeInstanceOf(GGBuilder);
    const withScale = withPoint.scaleXLog10().scaleYSqrt();
    expect(withScale).toBeInstanceOf(GGBuilder);
    // Scale sugar remains available after immutable transitions.
    expect(typeof withScale.scaleColorContinuous).toBe("function");
    expect(withScale.spec().scales).toEqual({
      x: { type: "linear", transform: "log10" },
      y: { type: "linear", transform: "sqrt" },
    });
  });

  it("geomPoint()/geomLine() are exact sugar for .layer()", () => {
    const viaSugar = gg(rows, aes({ x: "x", y: "y" }))
      .geomPoint({ alpha: 0.5, aes: aes({ color: "cls" }) })
      .geomLine({ curve: "step" })
      .spec();
    const viaLayer = gg(rows, aes({ x: "x", y: "y" }))
      .layer({ geom: "point", aes: { color: "cls" }, params: { alpha: 0.5 } })
      .layer({ geom: "line", params: { curve: "step" } })
      .spec();
    expect(viaSugar).toEqual(viaLayer);
  });

  it("builder output equals normalize() of the equivalent hand-written spec", () => {
    const viaBuilder = gg(rows, aes({ x: "x", y: "y", color: "cls" }))
      .geomPoint()
      .labs({ title: "T" })
      .spec();
    const handWritten = normalize({
      data: { values: rows },
      aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "cls" } },
      layers: [{ geom: "point" }],
      labs: { title: "T" },
    });
    expect(viaBuilder).toEqual(handWritten);
  });

  // Data-form acceptance + Date snapshot/portable materialization:
  // packages/spec/tests/builder-data.test.ts

  it("labs() merges over previous labs", () => {
    const spec = gg(rows).geomPoint().labs({ title: "T" }).labs({ x: "X" }).spec();
    expect(spec.labs).toEqual({ title: "T", x: "X" });
  });
});

describe("gg builder — M2 sugar methods", () => {
  const xy = { x: [1, 2, 3, 4], y: [2, 3, 4, 5] };

  it("geomHistogram compiles to the canonical bar + bin layer", () => {
    const spec = gg({ v: [1, 2, 3] }, aes({ x: "v" }))
      .geomHistogram({ binwidth: 1 })
      .spec();
    expect(spec.layers[0]).toEqual({
      geom: "bar",
      stat: "bin",
      position: "stack",
      aes: { x: { field: "v" }, y: { stat: "count" } },
      params: { binwidth: 1 },
    });
  });

  it("geomSmooth carries method/se/span params", () => {
    const spec = gg(xy, aes({ x: "x", y: "y" }))
      .geomSmooth({ method: "loess", span: 0.5, se: false })
      .spec();
    expect(spec.layers[0]).toMatchObject({
      geom: "smooth",
      stat: "smooth",
      position: "identity",
      params: { method: "loess", span: 0.5, se: false },
    });
  });

  it("geomBoxplot defaults to dodge; geomDensity to identity", () => {
    const spec = gg({ c: ["a"], v: [1] }, aes({ x: "c", y: "v" }))
      .geomBoxplot()
      .spec();
    expect(spec.layers[0]).toMatchObject({ stat: "boxplot", position: "dodge" });
    const dens = gg({ v: [1, 2] }, aes({ x: "v" }))
      .geomDensity({ adjust: 2 })
      .spec();
    expect(dens.layers[0]).toMatchObject({
      stat: "density",
      aes: { y: { stat: "density" } },
      params: { adjust: 2 },
    });
  });

  it("geomErrorbar routes the stat option out of params", () => {
    const spec = gg({ g: ["a"], v: [1] }, aes({ x: "g", y: "v" }))
      .geomErrorbar({ stat: "summary", fun: "median", funMin: "min", funMax: "max" })
      .spec();
    expect(spec.layers[0]).toMatchObject({
      geom: "errorbar",
      stat: "summary",
      params: { fun: "median", funMin: "min", funMax: "max" },
    });
  });

  it("geomPoint routes position + positionParams out of params", () => {
    const spec = gg(xy, aes({ x: "x", y: "y" }))
      .geomPoint({ position: "jitter", positionParams: { seed: 3, width: 0.1 }, alpha: 0.4 })
      .spec();
    expect(spec.layers[0]).toEqual({
      geom: "point",
      stat: "identity",
      position: "jitter",
      positionParams: { seed: 3, width: 0.1 },
      aes: { x: { field: "x" }, y: { field: "y" } },
      params: { alpha: 0.4 },
    });
  });
});
