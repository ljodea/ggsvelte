import { describe, expect, it } from "bun:test";

import { SCALE_CAPABILITIES } from "../src/capabilities.js";
import * as spec from "../src/index.js";

const registry = spec as Record<string, unknown>;

function validateStyle(
  aesthetic: "size" | "linewidth" | "alpha" | "shape" | "linetype",
  scale: object,
) {
  const geom = aesthetic === "linewidth" || aesthetic === "linetype" ? "line" : "point";
  return spec.validate({
    data: { values: [{ x: 1, y: 2, value: 3 }] },
    aes: { x: { field: "x" }, y: { field: "y" }, [aesthetic]: { field: "value" } },
    layers: [{ geom }],
    scales: { [aesthetic]: scale },
  });
}

describe("mapped style capability contract", () => {
  it("publishes implemented numeric and finite-symbol scale families", () => {
    const numeric = SCALE_CAPABILITIES.find(({ family }) => family === "numeric-style");
    expect(numeric).toMatchObject({
      aesthetics: ["size", "linewidth", "alpha"],
      scaleTypes: ["sequential", "ordinal", "binned", "manual", "identity"],
      runtime: "implemented",
    });
    const finite = SCALE_CAPABILITIES.find(({ family }) => family === "finite-style");
    expect(finite).toMatchObject({
      aesthetics: ["shape", "linetype"],
      scaleTypes: ["ordinal", "binned", "manual", "identity"],
      runtime: "implemented",
    });
  });

  it("exports binding-identical camelCase and ggplot2 aliases", () => {
    const aliases: Record<string, string> = {
      scale_size_continuous: "scaleSizeContinuous",
      scale_size_discrete: "scaleSizeDiscrete",
      scale_size_binned: "scaleSizeBinned",
      scale_size_date: "scaleSizeDate",
      scale_size_datetime: "scaleSizeDatetime",
      scale_size_manual: "scaleSizeManual",
      scale_size_identity: "scaleSizeIdentity",
      scale_linewidth_continuous: "scaleLinewidthContinuous",
      scale_linewidth_discrete: "scaleLinewidthDiscrete",
      scale_linewidth_binned: "scaleLinewidthBinned",
      scale_linewidth_date: "scaleLinewidthDate",
      scale_linewidth_datetime: "scaleLinewidthDatetime",
      scale_linewidth_manual: "scaleLinewidthManual",
      scale_linewidth_identity: "scaleLinewidthIdentity",
      scale_alpha_continuous: "scaleAlphaContinuous",
      scale_alpha_discrete: "scaleAlphaDiscrete",
      scale_alpha_binned: "scaleAlphaBinned",
      scale_alpha_date: "scaleAlphaDate",
      scale_alpha_datetime: "scaleAlphaDatetime",
      scale_alpha_manual: "scaleAlphaManual",
      scale_alpha_identity: "scaleAlphaIdentity",
      scale_shape: "scaleShapeDiscrete",
      scale_shape_discrete: "scaleShapeDiscrete",
      scale_shape_binned: "scaleShapeBinned",
      scale_shape_manual: "scaleShapeManual",
      scale_shape_identity: "scaleShapeIdentity",
      scale_linetype: "scaleLinetypeDiscrete",
      scale_linetype_discrete: "scaleLinetypeDiscrete",
      scale_linetype_binned: "scaleLinetypeBinned",
      scale_linetype_manual: "scaleLinetypeManual",
      scale_linetype_identity: "scaleLinetypeIdentity",
    };
    for (const [alias, canonical] of Object.entries(aliases)) {
      expect(typeof registry[canonical]).toBe("function");
      expect(registry[alias]).toBe(registry[canonical]);
    }
  });

  it("emits canonical portable family configurations", () => {
    const call = (name: string, options?: unknown) =>
      (registry[name] as (options?: unknown) => unknown)(options);
    expect(call("scaleSizeContinuous", { range: [2, 10] })).toEqual({
      size: { type: "sequential", range: [2, 10] },
    });
    expect(call("scaleLinewidthBinned", { breaks: [0, 10, 20] })).toEqual({
      linewidth: { type: "binned", breaks: [0, 10, 20] },
    });
    expect(call("scaleAlphaIdentity")).toEqual({ alpha: { type: "identity" } });
    expect(call("scaleShapeManual", { domain: ["a", "b"], values: ["circle", "diamond"] })).toEqual(
      {
        shape: { type: "manual", domain: ["a", "b"], range: ["circle", "diamond"] },
      },
    );
    expect(call("scaleLinetypeDiscrete")).toEqual({ linetype: { type: "ordinal" } });
  });

  it("exposes scale-local guides through every constrained style helper type", () => {
    const guide = spec.guideLegend({ force: true });
    expect(spec.scaleSizeDiscrete({ guide })).toEqual({
      size: { type: "ordinal", guide },
    });
    expect(spec.scaleSizeManual({ values: [4], guide })).toEqual({
      size: { type: "manual", range: [4], guide },
    });
    expect(spec.scaleSizeIdentity({ guide })).toEqual({
      size: { type: "identity", guide },
    });
    expect(spec.scaleShapeDiscrete({ guide })).toEqual({
      shape: { type: "ordinal", guide },
    });
    expect(spec.scaleShapeBinned({ guide })).toEqual({
      shape: { type: "binned", guide },
    });
    expect(spec.scaleShapeManual({ values: ["circle"], guide })).toEqual({
      shape: { type: "manual", range: ["circle"], guide },
    });
    expect(spec.scaleShapeIdentity({ guide })).toEqual({
      shape: { type: "identity", guide },
    });
  });

  it("keeps runtime, TypeBox, and family restrictions aligned", () => {
    expect(validateStyle("size", { type: "sequential", range: [2, 10] }).ok).toBe(true);
    expect(validateStyle("linewidth", { type: "binned", breaks: [0, 2, 4] }).ok).toBe(true);
    expect(validateStyle("alpha", { type: "manual", domain: [3], range: [0.5] }).ok).toBe(true);
    expect(validateStyle("shape", { type: "manual", domain: [3], range: ["triangle"] }).ok).toBe(
      true,
    );
    expect(validateStyle("linetype", { type: "identity" }).ok).toBe(true);

    expect(validateStyle("shape", { type: "sequential" }).ok).toBe(false);
    expect(validateStyle("linetype", { type: "sequential" }).ok).toBe(false);
    expect(validateStyle("shape", { type: "binned", domain: ["low", "high"] }).ok).toBe(false);
    expect(validateStyle("alpha", { type: "sequential", range: [-1, 2] }).ok).toBe(false);
    expect(validateStyle("shape", { type: "manual", domain: [3], range: ["unknown"] }).ok).toBe(
      false,
    );
  });

  it("builder methods serialize calendar Dates mapped to numeric styles", () => {
    const built = spec
      .gg([{ x: 1, y: 2, when: new Date("2024-02-03T04:05:06.000Z") }], {
        x: "x",
        y: "y",
        size: "when",
      })
      .geomPoint()
      .scaleSizeDate()
      .spec();
    expect(built.data).toEqual({ values: [{ x: 1, y: 2, when: "2024-02-03" }] });
    expect(built.scales).toEqual({ size: { type: "sequential", temporalKind: "date" } });
  });

  it("accepts every registered point shape as a scalar geom param", () => {
    // The scalar params.shape schema must reuse the same shape registry as the
    // shape scale, so the newly added diamond/plus/cross draw as literal shapes.
    for (const shape of ["circle", "triangle", "square", "diamond", "plus", "cross"] as const) {
      const result = spec.validate({
        data: { values: [{ x: 1, y: 2 }] },
        aes: { x: { field: "x" }, y: { field: "y" } },
        layers: [{ geom: "point", params: { shape } }],
      });
      expect(result.ok).toBe(true);
    }
  });
});
