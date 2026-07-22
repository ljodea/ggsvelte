/**
 * Logical x/y value resolution for candidate datums.
 */
import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

import { resolveCandidateLogicalValues } from "../../src/pipeline/candidate-construction/datum-values.ts";

describe("resolveCandidateLogicalValues", () => {
  it("prefers annotation intercepts when the layer is an annotation rule", () => {
    expect(
      resolveCandidateLogicalValues({
        annotationRule: true,
        annotationX: 3,
        annotationY: null,
        outlierSourceRow: null,
        sourceRow: 0,
        frame: undefined,
        frameRow: 0,
        primitiveIndex: 0,
        sourceValue: () => "ignored",
        xField: "x",
        yField: "y",
      }),
    ).toEqual({ xValue: 3, yValue: null });
  });

  it("reads source fields for identity rows and outliers when present", () => {
    expect(
      resolveCandidateLogicalValues({
        annotationRule: false,
        annotationX: null,
        annotationY: null,
        outlierSourceRow: null,
        sourceRow: 2,
        frame: undefined,
        frameRow: 0,
        primitiveIndex: 0,
        sourceValue: (field) => (field === "x" ? 11 : field === "y" ? 22 : null),
        xField: "x",
        yField: "y",
      }),
    ).toEqual({ xValue: 11, yValue: 22 });
  });

  it("uses frame xValues/yValues for aggregate rows without sourceRow", () => {
    const frame = fromAny({
      xValues: ["a", "b"],
      yValues: [10, 20],
      xNumeric: null,
      yNumeric: null,
      box: null,
      binding: {},
    });
    expect(
      resolveCandidateLogicalValues({
        annotationRule: false,
        annotationX: null,
        annotationY: null,
        outlierSourceRow: null,
        sourceRow: null,
        frame,
        frameRow: 1,
        primitiveIndex: 0,
        sourceValue: () => "ignored",
        xField: "x",
        yField: "y",
      }),
    ).toEqual({ xValue: "b", yValue: 20 });
  });

  it("inverts scale-space numerics when a position transform is present", () => {
    const frame = fromAny({
      xValues: null,
      yValues: null,
      xNumeric: new Float64Array([4]), // scale-space
      yNumeric: new Float64Array([9]),
      box: null,
      binding: {
        xTransform: { transform: { inverse: (v: number) => v / 2 } },
        yTransform: { transform: { inverse: (v: number) => Math.sqrt(v) } },
      },
    });
    expect(
      resolveCandidateLogicalValues({
        annotationRule: false,
        annotationX: null,
        annotationY: null,
        outlierSourceRow: null,
        sourceRow: null,
        frame,
        frameRow: 0,
        primitiveIndex: 0,
        sourceValue: () => null,
        xField: "x",
        yField: "y",
      }),
    ).toEqual({ xValue: 2, yValue: 3 });
  });

  it("reads boxplot outlier coordinates when outlierSourceRow is set", () => {
    const frame = fromAny({
      xValues: null,
      yValues: null,
      xNumeric: null,
      yNumeric: null,
      box: {
        outlierX: [1.5],
        outlierY: [99],
        middle: [50],
      },
      binding: {},
    });
    expect(
      resolveCandidateLogicalValues({
        annotationRule: false,
        annotationX: null,
        annotationY: null,
        outlierSourceRow: 7,
        sourceRow: null,
        frame,
        frameRow: 0,
        primitiveIndex: 0,
        sourceValue: () => "ignored",
        xField: "x",
        yField: "y",
      }),
    ).toEqual({ xValue: 1.5, yValue: 99 });
  });
});
