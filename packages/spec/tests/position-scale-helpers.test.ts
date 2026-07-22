/**
 * Position scale helper families, builder equality, and limits sugar.
 * Schema/normalize/portability: position-scale-schema.test.ts.
 * Production: scale-position-helpers.ts + builder scale sugar (builder-scales.ts).
 */
import { describe, expect, it } from "bun:test";

import { gg } from "../src/index.ts";
import { normalize } from "../src/normalize.ts";
import {
  scale_x_binned,
  scale_x_continuous,
  scale_x_log10,
  scale_x_reverse,
  scale_x_sqrt,
  scale_y_binned,
  scale_y_continuous,
  scale_y_log10,
  scale_y_reverse,
  scale_y_sqrt,
  scaleXBinned,
  scaleXContinuous,
  scaleXLog10,
  scaleXReverse,
  scaleXSqrt,
  scaleYBinned,
  scaleYContinuous,
  scaleYLog10,
  scaleYReverse,
  scaleYSqrt,
} from "../src/scale-helpers.ts";

describe("helper families — canonical output + alias identity", () => {
  it("continuous helpers emit a bare linear family", () => {
    expect(scaleXContinuous()).toEqual({ x: { type: "linear" } });
    expect(scaleYContinuous()).toEqual({ y: { type: "linear" } });
  });

  it("log10 / sqrt helpers emit the transform", () => {
    expect(scaleXLog10()).toEqual({ x: { type: "linear", transform: "log10" } });
    expect(scaleYLog10()).toEqual({ y: { type: "linear", transform: "log10" } });
    expect(scaleXSqrt()).toEqual({ x: { type: "linear", transform: "sqrt" } });
    expect(scaleYSqrt()).toEqual({ y: { type: "linear", transform: "sqrt" } });
  });

  it("reverse helpers emit an identity linear scale with reverse", () => {
    expect(scaleXReverse()).toEqual({ x: { type: "linear", reverse: true } });
    expect(scaleYReverse()).toEqual({ y: { type: "linear", reverse: true } });
  });

  it("binned helpers emit the binned family", () => {
    expect(scaleXBinned()).toEqual({ x: { type: "binned" } });
    expect(scaleYBinned()).toEqual({ y: { type: "binned" } });
  });

  it("forwards options into the emitted scale", () => {
    expect(scaleXLog10({ oob: "squish", naValue: 1 })).toEqual({
      x: { type: "linear", transform: "log10", oob: "squish", naValue: 1 },
    });
    expect(scaleYBinned({ breaks: [0, 10, 20] })).toEqual({
      y: { type: "binned", breaks: [0, 10, 20] },
    });
  });

  it("exports binding-identical camel and snake aliases", () => {
    expect(scale_x_continuous).toBe(scaleXContinuous);
    expect(scale_y_continuous).toBe(scaleYContinuous);
    expect(scale_x_log10).toBe(scaleXLog10);
    expect(scale_y_log10).toBe(scaleYLog10);
    expect(scale_x_sqrt).toBe(scaleXSqrt);
    expect(scale_y_sqrt).toBe(scaleYSqrt);
    expect(scale_x_reverse).toBe(scaleXReverse);
    expect(scale_y_reverse).toBe(scaleYReverse);
    expect(scale_x_binned).toBe(scaleXBinned);
    expect(scale_y_binned).toBe(scaleYBinned);
  });
});

describe("helper == builder == canonical normalized equality", () => {
  const build = (b: ReturnType<typeof gg>) => b.spec().scales;

  const pointPlot = () => gg([{ a: 1, b: 2 }]).layer({ geom: "point", aes: { x: "a", y: "b" } });

  it("scaleXLog10 matches the builder method and canonical JSON", () => {
    const canonical = normalize({
      layers: [{ geom: "point", aes: { x: "a", y: "b" } }],
      scales: { x: { type: "linear", transform: "log10" } },
    }).scales;
    const helper = normalize({
      layers: [{ geom: "point", aes: { x: "a", y: "b" } }],
      scales: scaleXLog10(),
    }).scales;
    const builder = build(pointPlot().scaleXLog10());
    expect(helper).toEqual(canonical);
    expect(builder).toEqual(canonical);
  });

  it("scaleYSqrt / scaleXBinned / scaleXReverse round-trip through the builder", () => {
    expect(build(pointPlot().scaleYSqrt())?.y).toEqual({ type: "linear", transform: "sqrt" });
    expect(build(pointPlot().scaleXBinned())?.x).toEqual({ type: "binned" });
    expect(build(pointPlot().scaleXReverse())?.x).toEqual({ type: "linear", reverse: true });
  });
});

describe("limits sugar", () => {
  it("canonicalizes limits to domain", () => {
    expect(scaleXContinuous({ limits: [1, 100] })).toEqual({
      x: { type: "linear", domain: [1, 100] },
    });
    expect(scaleYLog10({ limits: [1, 1000] })).toEqual({
      y: { type: "linear", transform: "log10", domain: [1, 1000] },
    });
  });

  it("rejects supplying both limits and domain", () => {
    expect(() => scaleXContinuous({ limits: [1, 100], domain: [1, 100] })).toThrow();
  });
});
