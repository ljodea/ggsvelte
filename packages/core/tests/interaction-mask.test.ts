import { describe, expect, it } from "bun:test";

import {
  buildInteractionMasks,
  buildPrimitiveInteractionMasks,
  legendValueEqual,
  resolveLegendFocusKeys,
  type SemanticCandidateKeys,
} from "../src/interaction-mask.ts";
import type { GeometryBatch } from "../src/scene.ts";

function pointBatch(count: number): GeometryBatch {
  return {
    kind: "points",
    layerIndex: 0,
    panelIndex: 0,
    positions: new Float32Array(count * 2),
    rowIndex: Uint32Array.from({ length: count }, (_, index) => index),
    size: 3,
    alpha: 1,
    shape: "circle",
    fill: null,
  };
}

function rectBatch(count: number): GeometryBatch {
  return {
    kind: "rects",
    layerIndex: 0,
    panelIndex: 0,
    rects: new Float32Array(count * 4),
    rowIndex: Uint32Array.from({ length: count }, (_, index) => index),
    alpha: 1,
    fill: null,
  };
}

describe("buildInteractionMasks", () => {
  it("projects semantic emphasis onto immutable per-batch primitive masks", () => {
    const candidates: SemanticCandidateKeys<string>[] = [
      { batchIndex: 0, primitiveIndex: 0, keys: ["alpha"] },
      { batchIndex: 0, primitiveIndex: 1, keys: ["beta", "shared"] },
      { batchIndex: 0, primitiveIndex: 2, keys: ["gamma"] },
    ];

    const masks = buildInteractionMasks([pointBatch(3)], ["shared"], candidates);

    expect(Object.isFrozen(masks)).toBe(true);
    expect(masks).toHaveLength(1);
    expect(masks[0]?.primitiveCount).toBe(3);
    expect(masks[0]?.focusedCount).toBe(1);
    expect(masks[0]?.isFocused(0)).toBe(false);
    expect(masks[0]?.isFocused(1)).toBe(true);
    expect(masks[0]?.isFocused(2)).toBe(false);
    expect(Object.isFrozen(masks[0])).toBe(true);
  });

  it("collapses path vertex candidates to their containing subpath", () => {
    const paths: GeometryBatch = {
      kind: "paths",
      layerIndex: 0,
      panelIndex: 0,
      positions: new Float32Array(12),
      rowIndex: new Uint32Array([0, 1, 2, 3, 4, 5]),
      pathOffsets: new Uint32Array([0, 2, 6]),
      strokes: [null, null],
      linewidth: 1,
      alpha: 1,
      curve: "linear",
    };
    const candidates: SemanticCandidateKeys<number>[] = [
      { batchIndex: 0, primitiveIndex: 0, keys: [10] },
      { batchIndex: 0, primitiveIndex: 1, keys: [11] },
      { batchIndex: 0, primitiveIndex: 4, keys: [20] },
    ];

    const [mask] = buildInteractionMasks([paths], [11], candidates);

    expect(mask?.primitiveCount).toBe(2);
    expect(mask?.focusedCount).toBe(1);
    expect(mask?.isFocused(0)).toBe(true);
    expect(mask?.isFocused(1)).toBe(false);
  });

  it("leaves annotation-only batches unaffected and disables masks without emphasis", () => {
    const batches = [pointBatch(2), pointBatch(1)];
    const candidates: SemanticCandidateKeys<string>[] = [
      { batchIndex: 0, primitiveIndex: 0, keys: ["alpha"] },
      { batchIndex: 0, primitiveIndex: 1, keys: [] },
    ];

    expect(buildInteractionMasks(batches, [], candidates)).toEqual([null, null]);
    expect(buildInteractionMasks(batches, ["missing"], candidates)[0]?.focusedCount).toBe(0);
    expect(buildInteractionMasks(batches, ["missing"], candidates)[1]).toBeNull();
  });

  it("ignores malformed candidate locations rather than corrupting another mask", () => {
    const candidates: SemanticCandidateKeys<string>[] = [
      { batchIndex: -1, primitiveIndex: 0, keys: ["focus"] },
      { batchIndex: 4, primitiveIndex: 0, keys: ["focus"] },
      { batchIndex: 0, primitiveIndex: 9, keys: ["focus"] },
    ];

    expect(buildInteractionMasks([pointBatch(1)], ["focus"], candidates)).toEqual([null]);
  });
});

describe("buildPrimitiveInteractionMasks", () => {
  it("marks explicit rect primitives without semantic keys", () => {
    const masks = buildPrimitiveInteractionMasks(
      [rectBatch(3)],
      [{ batchIndex: 0, primitiveIndex: 1 }],
    );
    expect(masks[0]?.focusedCount).toBe(1);
    expect(masks[0]?.isFocused(0)).toBe(false);
    expect(masks[0]?.isFocused(1)).toBe(true);
    expect(masks[0]?.isFocused(2)).toBe(false);
  });

  it("returns null masks when no primitives are supplied", () => {
    expect(buildPrimitiveInteractionMasks([rectBatch(2)], [])).toEqual([null]);
  });
});

describe("legend value resolution", () => {
  it("uses typed canonical equality for dates, NaN, signed zero, and null", () => {
    expect(legendValueEqual(new Date(123), new Date(123))).toBe(true);
    expect(legendValueEqual(new Date(123), 123)).toBe(false);
    expect(legendValueEqual(Number.NaN, Number.NaN)).toBe(true);
    expect(legendValueEqual(-0, 0)).toBe(true);
    expect(legendValueEqual(null, null)).toBe(true);
    expect(legendValueEqual(null, false)).toBe(false);
    expect(legendValueEqual("1", 1)).toBe(false);
  });

  it("resolves encoded values to deduplicated stable keys in source order", () => {
    const symbol = Symbol("row");
    const memberships = [
      { value: "west", keys: ["row-3", "row-1"] as const },
      { value: "east", keys: ["row-2"] as const },
      { value: "west", keys: ["row-1", symbol] as const },
    ];

    const keys = resolveLegendFocusKeys("west", memberships);

    expect(keys).toEqual(["row-3", "row-1", symbol]);
    expect(Object.isFrozen(keys)).toBe(true);
    expect(memberships[0]!.value).toBe("west");
  });
});
