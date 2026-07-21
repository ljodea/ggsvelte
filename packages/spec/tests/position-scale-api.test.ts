/**
 * PR 3 — position scale API/schema/normalization contract (red-first).
 *
 * Covers TypeBox/runtime parity for the new position-scale fields and enums,
 * the canonical `type: "log"` -> `{ type: "linear", transform: "log10" }`
 * normalization and its conflict matrix, helper/alias/builder/canonical
 * normalized equality per family, `limits` sugar, portability, and the
 * capability-ledger cross-validation. Structural preflight conflicts
 * (scale-type-transform-conflict, invalid-scale-* semantic checks) belong to
 * the core pipeline suite; this file owns the spec surface.
 */
import { describe, expect, it } from "bun:test";

import * as spec from "../src/index.ts";
import { gg } from "../src/index.ts";
import { normalize } from "../src/normalize.ts";
import type { PositionScaleSpec } from "../src/schema.ts";
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
import { validate } from "../src/validate.ts";

function validateScale(x: unknown, y?: unknown) {
  return validate(
    normalize({
      layers: [{ geom: "point", aes: { x: "a", y: "b" } }],
      // deliberately untyped: exercising schema acceptance/rejection
      scales: { x, ...(y !== undefined && { y }) } as never,
    }),
  );
}

const accepts = (x: unknown): boolean => validateScale(x).ok;

describe("PositionScaleSpec new fields — TypeBox/runtime parity", () => {
  it("accepts transform identity/log10/sqrt on the linear family", () => {
    expect(accepts({ type: "linear", transform: "identity" })).toBe(true);
    expect(accepts({ type: "linear", transform: "log10" })).toBe(true);
    expect(accepts({ type: "linear", transform: "sqrt" })).toBe(true);
  });

  it("rejects an unknown transform value", () => {
    expect(accepts({ type: "linear", transform: "ln" })).toBe(false);
    expect(accepts({ type: "linear", transform: "log2" })).toBe(false);
  });

  it("accepts a binned scale type", () => {
    expect(accepts({ type: "binned" })).toBe(true);
    expect(accepts({ type: "binned", transform: "log10" })).toBe(true);
  });

  it("accepts scalar and tuple expansion", () => {
    expect(accepts({ type: "linear", expand: { mult: 0.05, add: 0 } })).toBe(true);
    expect(accepts({ type: "linear", expand: { mult: [0.05, 0.1] } })).toBe(true);
    expect(accepts({ type: "linear", expand: { add: [1, 2] } })).toBe(true);
    expect(accepts({ type: "linear", expand: {} })).toBe(true);
  });

  it("rejects negative, overlong, and unknown-key expansion", () => {
    expect(accepts({ type: "linear", expand: { mult: -1 } })).toBe(false);
    expect(accepts({ type: "linear", expand: { add: [-1, 0] } })).toBe(false);
    expect(accepts({ type: "linear", expand: { mult: [1, 2, 3] } })).toBe(false);
    expect(accepts({ type: "linear", expand: { bogus: 1 } })).toBe(false);
    expect(accepts({ type: "linear", expand: { mult: "x" } })).toBe(false);
  });

  it("accepts oob censor/squish and rejects others", () => {
    expect(accepts({ type: "linear", oob: "censor" })).toBe(true);
    expect(accepts({ type: "linear", oob: "squish" })).toBe(true);
    expect(accepts({ type: "linear", oob: "drop" })).toBe(false);
  });

  it("accepts finite/null naValue and rejects non-numeric", () => {
    expect(accepts({ type: "linear", naValue: 0 })).toBe(true);
    expect(accepts({ type: "linear", naValue: null })).toBe(true);
    expect(accepts({ type: "linear", naValue: "x" })).toBe(false);
    expect(accepts({ type: "linear", naValue: true })).toBe(false);
  });

  it("accepts numeric minorBreaks and rejects empty/non-numeric", () => {
    expect(accepts({ type: "linear", minorBreaks: [1, 2, 3] })).toBe(true);
    expect(accepts({ type: "linear", minorBreaks: [] })).toBe(false);
    expect(accepts({ type: "linear", minorBreaks: ["a"] })).toBe(false);
  });

  it("still rejects genuinely unknown scale keys", () => {
    expect(accepts({ type: "linear", nonsense: 1 })).toBe(false);
  });
});

describe("normalize — canonical type:log matrix", () => {
  const scaleOf = (x: PositionScaleSpec) =>
    normalize({ layers: [{ geom: "point", aes: { x: "a", y: "b" } }], scales: { x } }).scales?.x;

  it("rewrites bare type:log to linear + log10", () => {
    expect(scaleOf({ type: "log" })).toEqual({ type: "linear", transform: "log10" });
  });

  it("rewrites synonymous type:log + transform:log10 to linear + log10", () => {
    expect(scaleOf({ type: "log", transform: "log10" })).toEqual({
      type: "linear",
      transform: "log10",
    });
  });

  it("preserves other options while rewriting log", () => {
    expect(scaleOf({ type: "log", zero: false, domain: [1, 100] })).toEqual({
      type: "linear",
      transform: "log10",
      zero: false,
      domain: [1, 100],
    });
  });

  it("leaves conflicting type:log + transform:identity|sqrt uncanonicalized", () => {
    expect(scaleOf({ type: "log", transform: "identity" })).toEqual({
      type: "log",
      transform: "identity",
    });
    expect(scaleOf({ type: "log", transform: "sqrt" })).toEqual({
      type: "log",
      transform: "sqrt",
    });
  });

  it("never throws on any matrix cell (pure normalize)", () => {
    for (const cell of [
      { type: "log" },
      { type: "log", transform: "log10" },
      { type: "log", transform: "identity" },
      { type: "log", transform: "sqrt" },
    ] as const) {
      expect(() => scaleOf(cell)).not.toThrow();
    }
  });

  it("is idempotent across the matrix", () => {
    for (const cell of [
      { type: "log" },
      { type: "log", transform: "log10" },
      { type: "log", transform: "identity" },
      { type: "linear", transform: "sqrt", expand: { mult: 0.05 } },
      { type: "binned", transform: "log10" },
    ] as const) {
      const once = normalize({
        layers: [{ geom: "point", aes: { x: "a", y: "b" } }],
        scales: { x: cell },
      });
      expect(normalize(once)).toEqual(once);
    }
  });
});

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

describe("portability of the new fields", () => {
  it("keeps a spec with new numeric fields portable", () => {
    const s = normalize({
      layers: [{ geom: "point", aes: { x: "a", y: "b" } }],
      scales: {
        x: { type: "linear", transform: "log10", expand: { mult: 0.05 }, minorBreaks: [1, 2, 5] },
      },
    });
    expect(spec.isPortable(s)).toBe(true);
  });

  it("still rejects a function anywhere in scales (no callbacks)", () => {
    const s = {
      edition: 1,
      layers: [
        { geom: "point", stat: "identity", position: "identity", aes: { x: { field: "a" } } },
      ],
      scales: { x: { type: "linear", transform: (v: number) => v } },
    };
    expect(spec.isPortable(s as never)).toBe(false);
  });
});

// Capability-ledger cross-validation lives in ./capabilities.test.ts.
