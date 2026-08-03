import { CANVAS_AUTO_THRESHOLD, runPipeline } from "@ggsvelte/core/render";
import { describe, expect, test } from "bun:test";

import { CANVAS_SCATTER_MARKS, cloud } from "../../../examples/point/canvas-scatter/data.ts";
import spec from "../../../examples/point/canvas-scatter/spec.ts";

describe("point/canvas-scatter showcase", () => {
  test("stays above the canvas auto threshold so VR/docs exercise a canvas stratum", () => {
    expect(CANVAS_SCATTER_MARKS).toBeGreaterThan(CANVAS_AUTO_THRESHOLD);
    expect(cloud.length).toBe(CANVAS_SCATTER_MARKS);
    expect(CANVAS_SCATTER_MARKS).toBe(2_500);
  });

  test("pipeline selects the canvas backend for the point layer", () => {
    const model = runPipeline(spec, { width: 640, height: 400 });
    try {
      expect(model.layerBackends[0]).toBe("canvas");
      expect(spec.labs?.title).toBe("2,500 points on a canvas stratum");
    } finally {
      model.dispose();
    }
  });
});
