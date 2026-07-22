import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

import { runPipeline } from "../../src/pipeline.js";

import { pointColors, pointSpec, size } from "./fixtures.ts";

describe("manual color scales", () => {
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

  it("keeps pinned manual legends complete without leaking unknown source values", () => {
    const singleton = runPipeline(
      pointSpec(["control"], {
        type: "manual",
        domain: ["control"],
        range: ["#f00"],
      }),
      size,
    );
    expect(singleton.scene.legends).toHaveLength(0);
    expect(singleton.guidePlans.find((plan) => plan.type === "discrete")).toBeDefined();

    const forced = runPipeline(
      pointSpec(["control"], {
        type: "manual",
        domain: ["control"],
        range: ["#f00"],
        guide: { type: "legend", force: true },
      }),
      size,
    );
    const singletonLegend = forced.scene.legends[0];
    if (singletonLegend?.type !== "discrete") throw new Error("expected forced singleton legend");
    expect(singletonLegend.entries).toHaveLength(1);

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
});
