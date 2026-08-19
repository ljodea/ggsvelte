import { describe, expect, it } from "bun:test";

import { trainSequential, wrapIntoPeriod } from "../src/scales/color.ts";
import { crameriRampStops } from "../src/scales/crameri-ramps.ts";

import { runPipeline } from "../src/pipeline.ts";
import { pointSpec, size } from "./pipeline-color-scales/fixtures.ts";

describe("wrapIntoPeriod", () => {
  it("maps the closed upper bound onto the lower bound", () => {
    expect(wrapIntoPeriod(360, 0, 360)).toBe(0);
    expect(wrapIntoPeriod(0, 0, 360)).toBe(0);
    expect(wrapIntoPeriod(370, 0, 360)).toBe(10);
    expect(wrapIntoPeriod(-10, 0, 360)).toBe(350);
  });
});

describe("cyclic sequential color", () => {
  const romaO = crameriRampStops("romaO")!;

  it("paints domain min and max with the same colour under wrap", () => {
    const scale = trainSequential([0, 360], { range: romaO, domain: [0, 360], oob: "wrap" });
    expect(scale.colorOf(0)).toBe(scale.colorOf(360));
    expect(scale.colorOf(360 + 360)).toBe(scale.colorOf(0));
    expect(scale.colorOf(-10)).toBe(scale.colorOf(350));
  });

  it("defaults cyclic schemes to wrap in the pipeline", () => {
    const model = runPipeline(
      pointSpec([0, 180, 370], { type: "sequential", scheme: "romaO", domain: [0, 360] }),
      size,
    );
    const scale = model.scales.color;
    if (scale?.kind !== "sequential") throw new Error("expected sequential color");
    expect(scale.scale.colorOf(0)).toBe(scale.scale.colorOf(360));
    expect(scale.scale.colorOf(370)).toBe(scale.scale.colorOf(10));
    expect(model.warnings.filter((warning) => warning.code === "color-unknown-values")).toEqual([]);
  });
});
