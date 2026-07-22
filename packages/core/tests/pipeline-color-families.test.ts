import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

import type { PortableSpec } from "@ggsvelte/spec";

import { runPipeline } from "../src/pipeline.js";
import { sceneToSVGString } from "../src/render-svg-scene.js";

const size = { width: 640, height: 400 };

function pointSpec(
  values: readonly unknown[],
  colorScale: Record<string, unknown>,
  legendOrder?: "stable-domain" | "present-first-seen" | "sorted",
): PortableSpec {
  return fromAny({
    data: {
      values: values.map((color, index) => ({ x: index + 1, y: index + 1, color })),
    },
    aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "color" } },
    layers: [{ geom: "point" }],
    scales: { color: colorScale },
    ...(legendOrder !== undefined && { legend: { order: legendOrder } }),
  });
}

function pointColors(model: ReturnType<typeof runPipeline>): string[] {
  const points = model.scene.batches.find((batch) => batch.kind === "points");
  if (points?.kind !== "points" || points.colors === undefined) {
    throw new Error("expected mapped point colors");
  }
  return points.colors;
}

describe("generic non-position color scales", () => {
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

  it("classifies deterministic binned boundaries and publishes colorsteps", () => {
    const model = runPipeline(
      pointSpec([1, 9, 10, 99, 100, 1000], {
        type: "binned",
        breaks: [1, 10, 100, 1000],
        range: ["#111", "#777", "#eee"],
      }),
      size,
    );
    const scale = model.scales.color;
    expect(scale?.kind).toBe("binned");
    if (scale?.kind !== "binned") throw new Error("expected binned scale");
    expect(scale.scale.domain).toEqual([1, 1000]);
    expect(scale.scale.breaks).toEqual([1, 10, 100, 1000]);
    expect(pointColors(model)).toEqual([
      "#111111",
      "#111111",
      "#777777",
      "#777777",
      "#eeeeee",
      "#eeeeee",
    ]);

    const legend = model.scene.legends.find((candidate) => candidate.type === "steps");
    if (legend?.type !== "steps") throw new Error("expected steps scene legend");
    expect(legend.entries.map(({ color }) => color)).toEqual(["#eeeeee", "#777777", "#111111"]);
    expect(sceneToSVGString(model.scene)).toContain('class="gg-legend-step"');

    const plan = model.guidePlans.find((candidate) => candidate.type === "colorsteps");
    if (plan?.type !== "colorsteps") throw new Error("expected colorsteps plan");
    expect(plan.steps).toEqual([
      {
        lower: 1,
        upper: 10,
        lowerInclusive: true,
        upperInclusive: false,
        label: "1–10",
        color: "#111111",
      },
      {
        lower: 10,
        upper: 100,
        lowerInclusive: true,
        upperInclusive: false,
        label: "10–100",
        color: "#777777",
      },
      {
        lower: 100,
        upper: 1000,
        lowerInclusive: true,
        upperInclusive: true,
        label: "100–1,000",
        color: "#eeeeee",
      },
    ]);
  });

  it("squishes binned values in semantic space before transforming", () => {
    const model = runPipeline(
      pointSpec([0, 1, 10, 100], {
        type: "binned",
        transform: "log10",
        breaks: [1, 10, 100],
        range: ["#111", "#eee"],
        oob: "squish",
      }),
      size,
    );
    expect(pointColors(model)).toEqual(["#111111", "#111111", "#eeeeee", "#eeeeee"]);
    expect(model.warnings.map(({ code }) => code)).not.toContain("color-unknown-values");
  });

  it("maps manual domains without recycling and distinguishes NA from unknown", () => {
    const model = runPipeline(
      pointSpec(["control", "treated", "other", null], {
        type: "manual",
        domain: ["control", "treated"],
        range: ["#f00", "#00f"],
        naValue: "#aaa",
        unknownValue: "#333",
      }),
      size,
    );
    expect(model.scales.color?.kind).toBe("manual");
    expect(pointColors(model)).toEqual(["#ff0000", "#0000ff", "#333333", "#aaaaaa"]);
    const plan = model.guidePlans.find((candidate) => candidate.type === "discrete");
    if (plan?.type !== "discrete") throw new Error("expected discrete guide plan");
    expect(plan.entries.map(({ value, color }) => [value, color])).toEqual([
      ["control", "#ff0000"],
      ["treated", "#0000ff"],
    ]);
    expect(plan.unknownValue).toBe("#333333");
    expect(plan.naValue).toBe("#aaaaaa");
  });

  it("routes fill through the same manual family contract", () => {
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { x: "a", y: 1, fill: "control" },
            { x: "b", y: 2, fill: "treated" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, fill: { field: "fill" } },
        layers: [{ geom: "col" }],
        scales: {
          fill: {
            type: "manual",
            domain: ["control", "treated"],
            range: ["#f00", "#00f"],
          },
        },
      }),
      size,
    );
    expect(model.scales.fill?.kind).toBe("manual");
    const rects = model.scene.batches.find((batch) => batch.kind === "rects");
    if (rects?.kind !== "rects") throw new Error("expected mapped rectangles");
    expect(rects.fills).toEqual(["#ff0000", "#0000ff"]);
    expect(model.guidePlans.find((plan) => plan.type === "discrete")?.aesthetic).toBe("fill");
  });

  it("forwards valid identity colors and applies explicit invalid/NA policies", () => {
    const model = runPipeline(
      pointSpec(["#f00", "#00ff00", "red", null], {
        type: "identity",
        naValue: "#aaa",
        unknownValue: "#333",
      }),
      size,
    );
    expect(model.scales.color?.kind).toBe("identity");
    expect(pointColors(model)).toEqual(["#ff0000", "#00ff00", "#333333", "#aaaaaa"]);
    expect(model.scene.legends).toHaveLength(0);
    expect(model.guidePlans.some((candidate) => candidate.aesthetic === "color")).toBe(false);
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

  it("formats temporal colorbar and binned labels with the authored grammar", () => {
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

    const binned = runPipeline(
      pointSpec([1, 10, 100], {
        type: "binned",
        breaks: [1, 10, 100],
        labels: ".1f",
      }),
      size,
    );
    const colorsteps = binned.guidePlans.find((candidate) => candidate.type === "colorsteps");
    if (colorsteps?.type !== "colorsteps") throw new Error("expected colorsteps plan");
    expect(colorsteps.steps.map((step) => step.label)).toEqual(["1.0–10.0", "10.0–100.0"]);
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

  it("keeps pinned manual legends complete without leaking unknown source values", () => {
    const singleton = runPipeline(
      pointSpec(["control"], {
        type: "manual",
        domain: ["control"],
        range: ["#f00"],
      }),
      size,
    );
    const singletonLegend = singleton.scene.legends[0];
    if (singletonLegend?.type !== "discrete") throw new Error("expected singleton legend");
    expect(singletonLegend.entries).toHaveLength(1);
    expect(singleton.guidePlans.find((plan) => plan.type === "discrete")).toBeDefined();

    const pinned = runPipeline(
      pointSpec(
        ["other", "treated", "control", null],
        {
          type: "manual",
          domain: ["control", "treated"],
          range: ["#f00", "#00f"],
        },
        "present-first-seen",
      ),
      size,
    );
    const legend = pinned.scene.legends[0];
    if (legend?.type !== "discrete") throw new Error("expected pinned manual legend");
    expect(legend.entries.map((entry) => entry.value)).toEqual(["treated", "control"]);
    expect(pinned.warnings.map((warning) => warning.code)).toContain("color-na-values");
    expect(pinned.warnings.map((warning) => warning.code)).toContain("color-unknown-values");
  });

  it("rejects a binned domain that disagrees with explicit boundaries", () => {
    expect(() =>
      runPipeline(
        pointSpec([0, 50, 100], {
          type: "binned",
          domain: [0, 100],
          breaks: [10, 50, 90],
        }),
        size,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "color-binned-domain",
        path: "/scales/color/domain",
      }),
    );
  });
});
