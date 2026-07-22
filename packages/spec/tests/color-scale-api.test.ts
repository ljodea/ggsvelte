import { describe, expect, it } from "bun:test";

import {
  gg,
  normalize,
  scaleColorBinned,
  scaleColorContinuous,
  scaleColorDate,
  scaleColorDatetime,
  scaleColorDiscrete,
  scaleColorIdentity,
  scaleColorLog10,
  scaleColorManual,
  scaleColorSqrt,
  scaleColourBinned,
  scaleColourContinuous,
  scaleColourDate,
  scaleColourDatetime,
  scaleColourDiscrete,
  scaleColourIdentity,
  scaleColourLog10,
  scaleColourManual,
  scaleColourSqrt,
  scaleFillBinned,
  scaleFillContinuous,
  scaleFillDate,
  scaleFillDatetime,
  scaleFillDiscrete,
  scaleFillIdentity,
  scaleFillLog10,
  scaleFillManual,
  scaleFillSqrt,
  scale_color_binned,
  scale_color_continuous,
  scale_color_date,
  scale_color_datetime,
  scale_color_discrete,
  scale_color_identity,
  scale_color_log10,
  scale_color_manual,
  scale_color_sqrt,
  scale_colour_binned,
  scale_colour_continuous,
  scale_colour_date,
  scale_colour_datetime,
  scale_colour_discrete,
  scale_colour_identity,
  scale_colour_log10,
  scale_colour_manual,
  scale_colour_sqrt,
  scale_fill_binned,
  scale_fill_continuous,
  scale_fill_date,
  scale_fill_datetime,
  scale_fill_discrete,
  scale_fill_identity,
  scale_fill_log10,
  scale_fill_manual,
  scale_fill_sqrt,
  validate,
} from "../src/index.js";

const point = { geom: "point" as const };

function validScale(scale: Record<string, unknown>): boolean {
  return validate({
    data: { values: [{ x: 1, y: 2, value: 10 }] },
    aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "value" } },
    layers: [point],
    scales: { color: scale },
  }).ok;
}

describe("color/fill scale authoring API", () => {
  it("exports binding-identical color/colour camel and snake aliases", () => {
    const families = [
      [
        scaleColorContinuous,
        scaleColourContinuous,
        scale_color_continuous,
        scale_colour_continuous,
      ],
      [scaleColorDiscrete, scaleColourDiscrete, scale_color_discrete, scale_colour_discrete],
      [scaleColorBinned, scaleColourBinned, scale_color_binned, scale_colour_binned],
      [scaleColorLog10, scaleColourLog10, scale_color_log10, scale_colour_log10],
      [scaleColorSqrt, scaleColourSqrt, scale_color_sqrt, scale_colour_sqrt],
      [scaleColorDate, scaleColourDate, scale_color_date, scale_colour_date],
      [scaleColorDatetime, scaleColourDatetime, scale_color_datetime, scale_colour_datetime],
      [scaleColorManual, scaleColourManual, scale_color_manual, scale_colour_manual],
      [scaleColorIdentity, scaleColourIdentity, scale_color_identity, scale_colour_identity],
    ];
    for (const [primary, ...aliases] of families) {
      for (const alias of aliases) expect(alias).toBe(primary);
    }
  });

  it("exports binding-identical fill snake aliases", () => {
    expect(scale_fill_continuous).toBe(scaleFillContinuous);
    expect(scale_fill_discrete).toBe(scaleFillDiscrete);
    expect(scale_fill_binned).toBe(scaleFillBinned);
    expect(scale_fill_log10).toBe(scaleFillLog10);
    expect(scale_fill_sqrt).toBe(scaleFillSqrt);
    expect(scale_fill_date).toBe(scaleFillDate);
    expect(scale_fill_datetime).toBe(scaleFillDatetime);
    expect(scale_fill_manual).toBe(scaleFillManual);
    expect(scale_fill_identity).toBe(scaleFillIdentity);
  });

  it("emits canonical family, transform, and temporal intent", () => {
    expect(scaleColorContinuous()).toEqual({ color: { type: "sequential" } });
    expect(scaleColorDiscrete()).toEqual({ color: { type: "ordinal" } });
    expect(scaleColorBinned({ breaks: [0, 5, 10] })).toEqual({
      color: { type: "binned", breaks: [0, 5, 10] },
    });
    expect(scaleColorLog10()).toEqual({ color: { type: "sequential", transform: "log10" } });
    expect(scaleColorSqrt()).toEqual({ color: { type: "sequential", transform: "sqrt" } });
    expect(scaleColorDate()).toEqual({
      color: { type: "sequential", temporalKind: "date" },
    });
    expect(scaleColorDatetime()).toEqual({
      color: { type: "sequential", temporalKind: "datetime" },
    });
    expect(scaleColorIdentity()).toEqual({ color: { type: "identity" } });
    expect(scaleFillContinuous()).toEqual({ fill: { type: "sequential" } });
  });

  it("canonicalizes manual values and matches builder and PortableSpec JSON", () => {
    const helper = scaleColorManual({
      domain: ["control", "treated"],
      values: ["#f00", "#00f"],
      unknownValue: "#999",
    });
    const canonical = {
      color: {
        type: "manual" as const,
        domain: ["control", "treated"],
        range: ["#ff0000", "#0000ff"],
        unknownValue: "#999999",
      },
    };
    expect(normalize({ layers: [point], scales: helper }).scales).toEqual(canonical);
    expect(
      gg([{ x: 1, y: 2 }], { x: "x", y: "y" })
        .geomPoint()
        .scaleColorManual({
          domain: ["control", "treated"],
          values: ["#f00", "#00f"],
          unknownValue: "#999",
        })
        .spec().scales,
    ).toEqual(canonical);
  });

  it("validates explicit temporal color parsing against whole-column evidence", () => {
    const temporal = {
      data: {
        values: [
          { x: 1, y: 2, when: "03/04/2024" },
          { x: 2, y: 3, when: "04/05/2024" },
        ],
      },
      aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "when" } },
      layers: [point],
      scales: {
        color: {
          type: "sequential" as const,
          temporalKind: "date" as const,
          parse: "dmy" as const,
        },
      },
    };
    expect(validate(temporal, {}).ok).toBe(true);
    expect(
      validate(
        {
          ...temporal,
          scales: { color: { type: "sequential", temporalKind: "date" } },
        },
        {},
      ).ok,
    ).toBe(false);
  });

  it("accepts the complete portable family fields and rejects contradictions", () => {
    expect(
      validScale({
        type: "binned",
        transform: "sqrt",
        breaks: [0, 4, 9],
        range: ["#000", "#fff"],
        oob: "squish",
        naValue: "#aaa",
        unknownValue: "#999",
        reverse: true,
      }),
    ).toBe(true);
    expect(validScale({ type: "manual", domain: ["a"], range: ["#f00"] })).toBe(true);
    expect(validScale({ type: "identity", naValue: "#aaa", unknownValue: "#999" })).toBe(true);

    expect(validScale({ type: "manual", domain: ["a"] })).toBe(false);
    expect(validScale({ type: "identity", transform: "log10" })).toBe(false);
    expect(validScale({ type: "identity", domain: ["#f00"] })).toBe(false);
    expect(validScale({ type: "manual", domain: ["a"], range: ["#f00"], reverse: true })).toBe(
      false,
    );
    expect(validScale({ type: "ordinal", oob: "squish" })).toBe(false);
    expect(validScale({ type: "sequential", onExhaust: "error" })).toBe(false);
    expect(validScale({ type: "sequential", temporalKind: "date", transform: "sqrt" })).toBe(false);
    expect(
      validScale({ type: "binned", breaks: Array.from({ length: 66 }, (_, index) => index) }),
    ).toBe(false);
  });
});
