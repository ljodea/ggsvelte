/**
 * Layer-level auto inspect mode per geom.
 *
 * Before #1042 the switch ended in `default: return "xy"`, so `abline`,
 * `curve` and `blank` reached that arm without anyone deciding they should.
 * They now have explicit arms with the same answer, and these tests pin it —
 * so a later change to those three is a deliberate one with a failing test,
 * not a quiet consequence of touching the switch.
 */
import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { candidateAutoMode } from "../src/pipeline/frame-candidates-auto-mode.ts";
import type { LayerBinding } from "../src/pipeline/types.ts";

/** candidateAutoMode reads only the geom and the rule/ribbon discriminators. */
function binding(geom: string, extra: Record<string, unknown> = {}): LayerBinding {
  return fromPartial<LayerBinding>({ layer: fromPartial({ geom }), ...extra });
}

describe("candidateAutoMode (#1042)", () => {
  it("keeps the old default for the three geoms that used to fall through", () => {
    for (const geom of ["abline", "curve", "blank"]) {
      expect(candidateAutoMode(binding(geom), 0)).toBe("xy");
    }
  });

  it("gives points and area marks exact focus", () => {
    for (const geom of ["point", "count", "text", "label", "bar", "tile", "hex"]) {
      expect(candidateAutoMode(binding(geom), 0)).toBe("exact");
    }
  });

  it("gives line-shaped marks x-axis grouping", () => {
    for (const geom of ["line", "path", "area", "smooth", "boxplot", "violin"]) {
      expect(candidateAutoMode(binding(geom), 0)).toBe("x");
    }
  });

  it("orients ribbon from its own orientation", () => {
    expect(candidateAutoMode(binding("ribbon", { ribbonOrientation: "y" }), 0)).toBe("y");
    expect(candidateAutoMode(binding("ribbon", { ribbonOrientation: "x" }), 0)).toBe("x");
  });

  it("defers finite segments to geometry-based mode", () => {
    expect(candidateAutoMode(binding("segment"), 0)).toBeUndefined();
    expect(candidateAutoMode(binding("spoke"), 0)).toBeUndefined();
  });

  it("orients a rule from its form, and an annotation rule from the primitive", () => {
    expect(candidateAutoMode(binding("rule", { ruleForm: "vertical" }), 0)).toBe("x");
    expect(candidateAutoMode(binding("rule", { ruleForm: "horizontal" }), 0)).toBe("y");
    // Annotation rules carry both intercept lists: x-intercepts come first.
    const annotation = binding("rule", {
      ruleForm: "annotation",
      layer: fromPartial({ geom: "rule", params: { xintercept: [1, 2] } }),
    });
    expect(candidateAutoMode(annotation, 0)).toBe("x");
    expect(candidateAutoMode(annotation, 2)).toBe("y");
  });
});
