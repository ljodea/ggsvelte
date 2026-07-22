import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

import { runPipeline } from "../../src/pipeline.js";

import { pointColors, pointSpec, size } from "./fixtures.ts";

describe("sequential color scales", () => {
  it("applies log10 in semantic color space and publishes a colorbar plan", () => {
    const model = runPipeline(
      pointSpec([1, 10, 100, 1000], {
        type: "sequential",
        transform: "log10",
        range: ["#000", "#fff"],
      }),
      size,
    );
    const scale = model.scales.color;
    expect(scale?.kind).toBe("sequential");
    if (scale?.kind !== "sequential") throw new Error("expected sequential scale");
    expect(scale.scale.domain).toEqual([1, 1000]);
    expect(scale.scale.transformedDomain).toEqual([0, 3]);
    expect(scale.scale.colorOf(10)).toBe("#555555");
    expect(pointColors(model)).toEqual(["#000000", "#555555", "#aaaaaa", "#ffffff"]);

    const plan = model.guidePlans.find((candidate) => candidate.type === "colorbar");
    if (plan?.type !== "colorbar") throw new Error("expected colorbar plan");
    expect(plan).toMatchObject({
      aesthetic: "color",
      transform: "log10",
      domain: [1, 1000],
      direction: "ascending",
      naValue: "#999999",
      unknownValue: "#999999",
    });
    expect(plan.ticks.map((tick) => tick.value)).toEqual([1, 10, 100, 1000]);
    const legend = model.scene.legends.find((candidate) => candidate.type === "ramp");
    if (legend?.type !== "ramp") throw new Error("expected ramp scene legend");
    expect(legend.ticks).toEqual([
      { y: 96, label: "1" },
      { y: 64, label: "10" },
      { y: 32, label: "100" },
      { y: 0, label: "1,000" },
    ]);
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it("uses explicit semantic colorbar breaks under a transform", () => {
    const model = runPipeline(
      pointSpec([1, 10, 100, 1000], {
        type: "sequential",
        transform: "log10",
        breaks: [1, 100, 1000],
      }),
      size,
    );
    const plan = model.guidePlans.find((candidate) => candidate.type === "colorbar");
    if (plan?.type !== "colorbar") throw new Error("expected colorbar plan");
    expect(plan.ticks.map(({ value }) => value)).toEqual([1, 100, 1000]);
  });

  it("uses sequential intent when transform or temporal options omit the family", () => {
    expect(() =>
      runPipeline(pointSpec(["control", "treated"], { transform: "log10" }), size),
    ).toThrow(
      expect.objectContaining({
        code: "color-transform-empty",
        path: "/scales/color",
      }),
    );

    const temporal = runPipeline(
      pointSpec(["03/04/2024", "04/05/2024"], {
        temporalKind: "date",
        parse: "dmy",
      }),
      size,
    );
    expect(temporal.scales.color?.kind).toBe("sequential");
    const plan = temporal.guidePlans.find((candidate) => candidate.type === "colorbar");
    if (plan?.type !== "colorbar") throw new Error("expected inferred temporal colorbar");
    expect(plan.temporalKind).toBe("date");
  });

  it("rejects a transformed color scale when source evidence is temporal", () => {
    expect(() =>
      runPipeline(
        pointSpec(["2024-01-01", "2024-01-02"], {
          type: "sequential",
          transform: "log10",
        }),
        size,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "scale-type-transform-conflict",
        path: "/scales/color/transform",
      }),
    );
  });

  it("reuses canonical temporal parsing for date colorbars", () => {
    const model = runPipeline(
      pointSpec(["2022", "2023", "2024"], {
        type: "sequential",
        temporalKind: "date",
      }),
      size,
    );
    const scale = model.scales.color;
    expect(scale?.kind).toBe("sequential");
    if (scale?.kind !== "sequential") throw new Error("expected temporal sequential scale");
    expect(scale.scale.temporal).toBe(true);
    const plan = model.guidePlans.find((candidate) => candidate.type === "colorbar");
    if (plan?.type !== "colorbar") throw new Error("expected temporal colorbar plan");
    expect(plan.temporalKind).toBe("date");
    expect(plan.ticks[0]?.label).toBe("2022");
    expect(plan.ticks.at(-1)?.label).toBe("2024");
    expect(plan.ticks.every((tick) => tick.fullLabel.length > 0)).toBe(true);
  });

  it("formats temporal colorbar labels with the authored grammar", () => {
    const temporal = runPipeline(
      pointSpec(["2022", "2023", "2024"], {
        type: "sequential",
        temporalKind: "date",
        breaks: ["2022", "2023", "2024"],
        labels: "%y",
      }),
      size,
    );
    const colorbar = temporal.guidePlans.find((candidate) => candidate.type === "colorbar");
    if (colorbar?.type !== "colorbar") throw new Error("expected temporal colorbar plan");
    expect(colorbar.ticks.map((tick) => tick.label)).toEqual(["22", "23", "24"]);
    expect(colorbar.ticks.map((tick) => tick.fullLabel)).toEqual([
      "2022-01-01",
      "2023-01-01",
      "2024-01-01",
    ]);
  });

  it("rejects transformed colorbar breaks that cannot be projected", () => {
    expect(() =>
      runPipeline(
        pointSpec([1, 10, 100], {
          type: "sequential",
          transform: "log10",
          breaks: [-1, 10],
        }),
        size,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "color-domain-invalid",
        path: "/scales/color/breaks",
      }),
    );
  });

  it("formats log10 colorbar ticks with sub-unit decimals", () => {
    const model = runPipeline(
      pointSpec([0.001, 1000], { type: "sequential", transform: "log10" }),
      size,
    );
    const legend = model.scene.legends.find((candidate) => candidate.type === "ramp");
    if (legend?.type !== "ramp") throw new Error("expected ramp legend");
    expect(legend.ticks.map((tick) => tick.label)).toContain("0.001");
    expect(legend.ticks.map((tick) => tick.label)).not.toContain("0");
  });

  it("still checks temporalKind when parseFailure censors invalid rows", () => {
    expect(() =>
      runPipeline(
        fromAny({
          data: {
            values: [
              { x: 1, y: 1, t: "2024-01-01 12:00" },
              { x: 2, y: 2, t: "bad" },
              { x: 3, y: 3, t: "2024-02-01 12:00" },
            ],
          },
          layers: [
            {
              geom: "point",
              aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "t" } },
            },
          ],
          scales: {
            color: {
              type: "sequential",
              temporalKind: "date",
              parse: "ymd_hm",
              parseFailure: "censor",
            },
          },
        }),
        size,
      ),
    ).toThrow(expect.objectContaining({ code: "color-temporal-kind" }));
  });
});
