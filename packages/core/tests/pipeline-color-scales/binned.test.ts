import { describe, expect, it } from "bun:test";

import { runPipeline } from "../../src/pipeline.js";
import { sceneToSVGString } from "../../src/render-svg-scene.js";

import { pointColors, pointSpec, size } from "./fixtures.ts";

describe("binned color scales", () => {
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

  it("formats binned labels with the authored grammar", () => {
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
