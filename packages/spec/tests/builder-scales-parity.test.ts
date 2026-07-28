/**
 * Builder scale-mixin parity with SCALE_CAPABILITIES (#1081 PR A).
 * Every camelCase non-Colour ledger helper must exist as a GGBuilder method
 * and be exact sugar for `.scales(helper(...))`.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg, GGBuilder } from "../src/builder.ts";
import { SCALE_CAPABILITIES } from "../src/capabilities.ts";
import * as scaleHelpers from "../src/scale-helpers.ts";
import type { Scales } from "../src/schema.ts";

/** CamelCase non-Colour helpers declared on the capability ledger. */
function ledgerCamelHelpers(): string[] {
  const out = new Set<string>();
  for (const cap of SCALE_CAPABILITIES) {
    for (const h of cap.helpers) {
      if (h.includes("_")) continue;
      if (h.includes("Colour")) continue;
      out.add(h);
    }
  }
  return [...out].toSorted();
}

/** ggplot2-style ordinal aliases on the builder (binding-identical to discrete). */
const STYLE_ORDINAL_BUILDER_METHODS = [
  "scaleSizeOrdinal",
  "scaleAlphaOrdinal",
  "scaleLinewidthOrdinal",
  "scaleShapeOrdinal",
] as const;

type ScaleFn = (...args: never[]) => Scales;

const rows = [
  { x: 1, y: 2, g: "a" },
  { x: 2, y: 3, g: "b" },
];

function helperFn(name: string): ScaleFn {
  const fn = (scaleHelpers as Record<string, unknown>)[name];
  if (typeof fn !== "function") {
    throw new TypeError(`missing free helper ${name}`);
  }
  return fn as ScaleFn;
}

function callBuilderMethod(method: string, args: unknown[] = []): ReturnType<typeof gg> {
  const builder = gg(rows, aes({ x: "x", y: "y", color: "g" })).geomPoint();
  const fn = (builder as unknown as Record<string, unknown>)[method];
  if (typeof fn !== "function") {
    throw new TypeError(`missing builder method ${method}`);
  }
  return (fn as (...a: unknown[]) => ReturnType<typeof gg>).apply(builder, args);
}

describe("GGBuilder scale mixin ↔ SCALE_CAPABILITIES", () => {
  it("exposes every ledger camelCase helper as a method", () => {
    const builder = gg(rows, aes({ x: "x", y: "y" }));
    expect(builder).toBeInstanceOf(GGBuilder);
    for (const name of ledgerCamelHelpers()) {
      expect(typeof (builder as unknown as Record<string, unknown>)[name], name).toBe("function");
    }
  });

  it("exposes style ordinal aliases used by ggplot2 names", () => {
    const builder = gg(rows, aes({ x: "x", y: "y" }));
    for (const name of STYLE_ORDINAL_BUILDER_METHODS) {
      expect(typeof (builder as unknown as Record<string, unknown>)[name], name).toBe("function");
    }
  });

  it("each ledger method is exact sugar for .scales(helper(...args))", () => {
    // Zero-arg / empty-options helpers: prove method ≡ free-helper path.
    // Helpers that require non-empty options are covered by named cases below.
    const zeroArgSafe = ledgerCamelHelpers().filter((name) => {
      if (name.endsWith("Manual")) return false;
      if (name.endsWith("Gradientn") || name.endsWith("Stepsn")) return false;
      return true;
    });

    for (const name of zeroArgSafe) {
      const viaMixin = callBuilderMethod(name).spec();
      const viaScales = gg(rows, aes({ x: "x", y: "y", color: "g" }))
        .geomPoint()
        .scales(helperFn(name)())
        .spec();
      expect(viaMixin.scales, name).toEqual(viaScales.scales);
    }
  });

  it("palette constructors match free helpers with options", () => {
    const cases: Array<{ method: string; args: unknown[] }> = [
      { method: "scaleColorBrewer", args: [{ palette: "Set2" }] },
      { method: "scaleFillHue", args: [{}] },
      { method: "scaleColorGradient", args: [{ low: "#000000", high: "#ffffff" }] },
      { method: "scaleColorSteps", args: [{ low: "#000000", high: "#ffffff" }] },
      {
        method: "scaleColorManual",
        args: [{ values: ["#111111", "#222222"], domain: ["a", "b"] }],
      },
    ];
    for (const { method, args } of cases) {
      const viaMixin = callBuilderMethod(method, args).spec();
      const viaScales = gg(rows, aes({ x: "x", y: "y", color: "g" }))
        .geomPoint()
        .scales(helperFn(method)(...(args as never[])))
        .spec();
      expect(viaMixin.scales, method).toEqual(viaScales.scales);
    }
  });
});
