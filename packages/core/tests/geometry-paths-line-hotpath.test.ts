/**
 * Multi-series line hot path: continuous finite bucketing, style-subpath reuse,
 * and sort-already-ordered groups. Behavioral seams for competitive line-3xN work.
 */
import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { trainContinuous } from "../src/scales/train.ts";
import { bucketByGroup, sortGroupRowsByX } from "../src/pipeline/geometry-shared-bucket.ts";
import { splitStyleSubpaths } from "../src/pipeline/geometry-paths-style-subpaths.ts";
import type { Frame } from "../src/pipeline/geometry-shared.ts";
import type { LayerFrame } from "../src/pipeline/types.ts";
import type { ResolvedStyleScales } from "../src/pipeline/geometry-style.ts";

function continuousFrame(n: number, groups: number[]): LayerFrame {
  const xNumeric = new Float64Array(n);
  const yNumeric = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xNumeric[i] = i;
    yNumeric[i] = i * 2;
  }
  return fromAny<LayerFrame>({
    n,
    xNumeric,
    yNumeric,
    xValues: null,
    yValues: null,
    groups,
    rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
    binding: {
      index: 0,
      layer: { geom: "line", params: {} },
      color: { field: null, constant: null, scaledConstant: null, statColumn: null },
      fill: { field: null, constant: null, scaledConstant: null, statColumn: null },
      linewidth: { field: null, constant: null, scaledConstant: null, statColumn: null },
      alpha: { field: null, constant: null, scaledConstant: null, statColumn: null },
      linetype: { field: null, constant: null, scaledConstant: null, statColumn: null },
    },
  });
}

function continuousFx(): Frame {
  const xScale = trainContinuous([[0, 10]], {}).scale;
  const yScale = trainContinuous([[0, 20]], {}).scale;
  return fromPartial<Frame>({
    innerWidth: 100,
    innerHeight: 50,
    xScale,
    yScale,
  });
}

const emptyStyles = fromPartial<ResolvedStyleScales>({
  linewidth: null,
  alpha: null,
  linetype: null,
  size: null,
  shape: null,
});

describe("bucketByGroup continuous multi-series", () => {
  it("keeps finite continuous rows per group without band normalize", () => {
    // 2 series × 3 points interleaved as s0,s0,s0,s1,s1,s1
    const groups = [0, 0, 0, 1, 1, 1];
    const frame = continuousFrame(6, groups);
    // plant one non-finite y in series 1
    frame.yNumeric![4] = Number.NaN;
    const warnings: { code: string }[] = [];
    const buckets = bucketByGroup(frame, continuousFx(), null, warnings);
    expect(buckets).toEqual([
      [0, 1, 2],
      [3, 5],
    ]);
    expect(warnings.some((w) => w.code === "removed-missing")).toBe(true);
  });

  it("does not call continuous normalize during finite filtering", () => {
    const linear = trainContinuous([[0, 100]], {}).scale;
    let normalizeCalls = 0;
    const instrumented = {
      ...linear,
      type: "linear" as const,
      normalizeTransformed(value: number): number {
        normalizeCalls++;
        return linear.normalizeTransformed(value);
      },
    };
    const frame = continuousFrame(4, [0, 0, 1, 1]);
    const fx = fromPartial<Frame>({
      innerWidth: 100,
      innerHeight: 50,
      xScale: instrumented,
      yScale: instrumented,
    });
    bucketByGroup(frame, fx, null, []);
    // Continuous finite filter must not pay normalizeTransformed per axis×row.
    expect(normalizeCalls).toBe(0);
  });
});

describe("sortGroupRowsByX already-ordered groups", () => {
  it("leaves already x-sorted continuous groups in place", () => {
    const linear = trainContinuous([[0, 10]], {}).scale;
    const xNumeric = Float64Array.of(1, 2, 3, 10, 20, 30);
    const frame = fromAny<LayerFrame>({
      n: 6,
      xNumeric,
      xValues: null,
      groups: [0, 0, 0, 1, 1, 1],
    });
    const fx = fromPartial<Frame>({ xScale: linear });
    const groupRows = [
      [0, 1, 2],
      [3, 4, 5],
    ];
    const before = groupRows.map((r) => r.slice());
    sortGroupRowsByX(groupRows, frame, fx);
    expect(groupRows).toEqual(before);
  });
});

describe("splitStyleSubpaths without mapped stroke style", () => {
  it("reuses group row arrays (no per-group copy) when style is constant", () => {
    const frame = continuousFrame(4, [0, 0, 1, 1]);
    const grouped: number[][] = [
      [0, 1],
      [2, 3],
    ];
    const out = splitStyleSubpaths(frame, grouped, emptyStyles);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe(grouped[0]);
    expect(out[1]).toBe(grouped[1]);
  });

  it("still splits when linewidth is mapped per row", () => {
    const frame = continuousFrame(4, [0, 0, 0, 0]);
    frame.binding.linewidth = {
      field: "lw",
      constant: null,
      scaledConstant: null,
      statColumn: null,
    };
    // Force mapped style path: style values via frame columns used by mappedStyleOutput.
    // Use a binding that hasMappedStyle detects via field !== null.
    const grouped: number[][] = [[0, 1, 2, 3]];
    // Without a real style scale, mappedStyleOutput may return undefined keys —
    // still must not identity-reuse when hasMappedStyle is true.
    const out = splitStyleSubpaths(frame, grouped, emptyStyles);
    expect(out).not.toBe(grouped);
    // All rows same undefined style → one run that is a fresh array.
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0]).not.toBe(grouped[0]);
  });
});
