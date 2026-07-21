import { describe, expect, it } from "bun:test";

import type { CoordTransformAxisSpec } from "@ggsvelte/spec";

import { buildCoordAxisProjector, buildPanelCoordProjector } from "../src/coord-projector.ts";
import { projectGeometryBatch } from "../src/pipeline/coord-geometry.ts";
import type { SegmentsBatch } from "../src/scene.ts";
import { trainBand, trainContinuous } from "../src/scales/train.ts";
import { scaleTransform } from "../src/scales/transform.ts";

function linear(values: number[], transform: "identity" | "log10" | "sqrt" = "identity") {
  const definition = scaleTransform(transform);
  return trainContinuous([Float64Array.from(values.map((value) => definition.forward(value)))], {
    transform: definition,
    nice: false,
  }).scale;
}

function axis(
  scale: ReturnType<typeof linear>,
  spec: CoordTransformAxisSpec,
  name: "x" | "y" = "x",
) {
  return buildCoordAxisProjector(name, scale, spec);
}

describe("post-stat coordinate axis projector", () => {
  it("projects and inverts log10 in post-stat scale space", () => {
    const scale = linear([1, 100]);
    const projector = axis(scale, { transform: "log10", expand: false });
    const pre = scale.normalizeTransformed(10);
    expect(projector.projectFraction(pre)).toBeCloseTo(0.5, 12);
    expect(projector.invertFraction(0.5)).toBeCloseTo(pre, 12);
  });

  it("projects sqrt, coordinate reverse, and exact semantic limits", () => {
    const scale = linear([0, 100]);
    const sqrt = axis(scale, { transform: "sqrt", expand: false });
    expect(sqrt.projectFraction(scale.normalizeTransformed(25))).toBeCloseTo(0.5, 12);

    const limited = axis(scale, {
      transform: "identity",
      limits: [10, 90],
      reverse: true,
      expand: false,
    });
    expect(limited.projectFraction(scale.normalizeTransformed(10))).toBeCloseTo(1, 12);
    expect(limited.projectFraction(scale.normalizeTransformed(90))).toBeCloseTo(0, 12);
    expect(limited.invertFraction(1)).toBeCloseTo(scale.normalizeTransformed(10), 12);
  });

  it("keeps expanded descending sqrt limits inside the transform codomain", () => {
    const scale = linear([0, 100]);
    const projector = axis(scale, { transform: "sqrt", limits: [100, 0] });
    expect(projector.coordinateDomain[0]).toBeGreaterThanOrEqual(0);
    expect(projector.coordinateDomain[1]).toBeGreaterThanOrEqual(0);
    expect(projector.invertFraction(1)).toBeCloseTo(scale.normalizeTransformed(0), 12);
  });

  it("composes after a scale transform rather than forwarding semantic values twice", () => {
    const scale = linear([10, 1000], "log10");
    const projector = axis(scale, { transform: "sqrt", expand: false });
    // scale-space values are [1, 3], so sqrt(2) is between sqrt(1) and sqrt(3).
    const projected = projector.projectFraction(scale.normalizeTransformed(2));
    expect(projected).toBeCloseTo((Math.sqrt(2) - 1) / (Math.sqrt(3) - 1), 12);
    expect(projector.invertFraction(projected)).toBeCloseTo(scale.normalizeTransformed(2), 12);
  });

  it("tessellates diagonal segment render topology while retaining one semantic anchor", () => {
    const x = linear([1, 100]);
    const y = linear([1, 100]);
    const projector = buildPanelCoordProjector(
      { x, y },
      {
        type: "transform",
        x: { transform: "log10", expand: false },
        y: { transform: "sqrt", expand: false },
      },
    );
    const batch: SegmentsBatch = {
      kind: "segments",
      layerIndex: 0,
      panelIndex: 0,
      segments: Float32Array.from([0, 100, 100, 0]),
      rowIndex: Uint32Array.from([0]),
      stroke: null,
      linewidth: 1,
      alpha: 1,
    };
    projectGeometryBatch(batch, projector, 100, 100, []);
    expect((batch.renderPositions?.length ?? 0) / 2).toBeGreaterThan(2);
    expect(batch.renderPathOffsets).toEqual(
      Uint32Array.from([0, batch.renderPositions!.length / 2]),
    );
    expect(batch.anchorPositions).toHaveLength(2);
  });

  it("rejects invalid, temporal, and band coordinate domains with stable codes", () => {
    expect(() => axis(linear([0, 100]), { transform: "log10" })).toThrow(
      expect.objectContaining({ code: "coord-transform-domain" }),
    );
    const time = trainContinuous([Float64Array.from([0, 100])], {
      type: "time",
      nice: false,
    }).scale;
    expect(() => buildCoordAxisProjector("x", time, { transform: "log10" })).toThrow(
      expect.objectContaining({ code: "coord-transform-temporal" }),
    );
    const band = trainBand([["a", "b"]]);
    expect(() => buildCoordAxisProjector("x", band, { transform: "sqrt" })).toThrow(
      expect.objectContaining({ code: "coord-transform-continuous" }),
    );
  });
});
