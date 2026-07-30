import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { CandidateFacts } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

import type { PlotInteractionInterval } from "../../src/lib/interaction/interaction.js";
import { createSemanticCandidateProjection } from "../../src/lib/runtime/semantic-candidate-projection.svelte.js";
import { withFlushedEffectRoot } from "../helpers/effect-root.svelte.js";
import { modelFor } from "../helpers/model.js";
import { reactiveBox } from "../helpers/reactive-box.svelte.js";

const model = modelFor(
  gg(
    [
      { id: "a", x: 1, y: 1 },
      { id: "b", x: 10, y: 20 },
      { id: "c", x: 5, y: 8 },
    ],
    aes({ x: "x", y: "y" }),
  )
    .geomPoint()
    .spec(),
);

function keysFor(candidate: CandidateFacts): PropertyKey[] {
  return candidate.rowIndex === null ? [] : [String(candidate.rowIndex)];
}

function candidateForRow(rowIndex: number): CandidateFacts {
  for (let id = 0; id < model.candidates.size; id++) {
    const candidate = model.candidates.candidate(id);
    if (candidate?.rowIndex === rowIndex) return candidate;
  }
  throw new Error(`missing Candidate for row ${String(rowIndex)}`);
}

describe("createSemanticCandidateProjection", () => {
  it("keeps the CandidateStore idle when no semantic presentation is active", () => {
    let keyCalls = 0;
    const { value, destroy } = withFlushedEffectRoot(() =>
      createSemanticCandidateProjection({
        model: () => model,
        candidateSemanticKeys: (candidate) => {
          keyCalls++;
          return keysFor(candidate);
        },
        selectedKeys: () => [],
        intervalKeys: () => [],
        intervals: () => [],
        emphasisKeys: () => [],
        inspectionFocus: () => null,
      }),
    );

    expect(value.selectedAnchors).toEqual([]);
    expect(value.emphasizedAnchors).toEqual([]);
    expect(value.interactionMasks).toEqual([]);
    expect(value.intervalConsumptionCandidates).toEqual([]);
    expect(keyCalls).toBe(0);
    destroy();
  });

  it("does not mute siblings from rect inspection by default (#633)", () => {
    const colModel = modelFor(
      gg(
        [
          { category: "A", count: 10 },
          { category: "B", count: 20 },
          { category: "C", count: 15 },
        ],
        aes({ x: "category", y: "count" }),
      )
        .geomCol()
        .spec(),
    );
    const first = (() => {
      for (let id = 0; id < colModel.candidates.size; id++) {
        const candidate = colModel.candidates.candidate(id);
        if (candidate?.rowIndex === 0) return candidate;
      }
      throw new Error("missing col candidate");
    })();
    const { value, destroy } = withFlushedEffectRoot(() =>
      createSemanticCandidateProjection({
        model: () => colModel,
        candidateSemanticKeys: () => [],
        selectedKeys: () => [],
        intervalKeys: () => [],
        intervals: () => [],
        emphasisKeys: () => [],
        muteSiblingsOnInspect: () => false,
        inspectionFocus: () => ({
          sourceKeys: [],
          key: null,
          kind: first.kind,
          primitives: [
            {
              batchIndex: first.batchIndex,
              primitiveIndex: first.primitiveIndex,
            },
          ],
        }),
      }),
    );

    expect(first.kind).toBe("rects");
    expect(value.interactionMasks).toEqual([]);
    destroy();
  });

  it("builds interaction masks from keyless rect inspection when muteSiblings is on", () => {
    const colModel = modelFor(
      gg(
        [
          { category: "A", count: 10 },
          { category: "B", count: 20 },
          { category: "C", count: 15 },
        ],
        aes({ x: "category", y: "count" }),
      )
        .geomCol()
        .spec(),
    );
    const first = (() => {
      for (let id = 0; id < colModel.candidates.size; id++) {
        const candidate = colModel.candidates.candidate(id);
        if (candidate?.rowIndex === 0) return candidate;
      }
      throw new Error("missing col candidate");
    })();
    const { value, destroy } = withFlushedEffectRoot(() =>
      createSemanticCandidateProjection({
        model: () => colModel,
        candidateSemanticKeys: () => [],
        selectedKeys: () => [],
        intervalKeys: () => [],
        intervals: () => [],
        emphasisKeys: () => [],
        muteSiblingsOnInspect: () => true,
        inspectionFocus: () => ({
          sourceKeys: [],
          key: null,
          kind: first.kind,
          primitives: [
            {
              batchIndex: first.batchIndex,
              primitiveIndex: first.primitiveIndex,
            },
          ],
        }),
      }),
    );

    expect(first.kind).toBe("rects");
    expect(value.interactionMasks.some((mask) => mask !== null)).toBe(true);
    const mask = value.interactionMasks.find((entry) => entry !== null);
    expect(mask?.focusedCount).toBe(1);
    destroy();
  });

  it("layers keyless rect seed primitives under legend emphasis when muteSiblings is off (#633)", () => {
    const colModel = modelFor(
      gg(
        [
          { category: "A", count: 10 },
          { category: "B", count: 20 },
          { category: "C", count: 15 },
        ],
        aes({ x: "category", y: "count" }),
      )
        .geomCol()
        .spec(),
    );
    const first = (() => {
      for (let id = 0; id < colModel.candidates.size; id++) {
        const candidate = colModel.candidates.candidate(id);
        if (candidate?.rowIndex === 0) return candidate;
      }
      throw new Error("missing col candidate");
    })();
    const { value, destroy } = withFlushedEffectRoot(() =>
      createSemanticCandidateProjection({
        model: () => colModel,
        // No candidate has the emphasis key — only the rect seed should focus.
        candidateSemanticKeys: () => [],
        selectedKeys: () => [],
        intervalKeys: () => [],
        intervals: () => [],
        emphasisKeys: () => ["legend-only"],
        // Emphasis alone still layers rect seeds (#386); muteSiblings stays off.
        muteSiblingsOnInspect: () => false,
        inspectionFocus: () => ({
          sourceKeys: [],
          key: null,
          kind: first.kind,
          primitives: [
            {
              batchIndex: first.batchIndex,
              primitiveIndex: first.primitiveIndex,
            },
          ],
        }),
      }),
    );

    const mask = value.interactionMasks.find((entry) => entry !== null);
    expect(mask).toBeDefined();
    expect(mask?.isFocused(first.primitiveIndex)).toBe(true);
    expect(mask?.focusedCount).toBe(1);
    destroy();
  });

  it("unions key-based masks with rect inspection seed primitives", () => {
    // When legend emphasis matches real candidates AND inspection seeds a
    // different rect, both stay focused (OR merge of the two mask sources).
    const colModel = modelFor(
      gg(
        [
          { category: "A", count: 10 },
          { category: "B", count: 20 },
          { category: "C", count: 15 },
        ],
        aes({ x: "category", y: "count" }),
      )
        .geomCol()
        .spec(),
    );
    const byRow = (rowIndex: number) => {
      for (let id = 0; id < colModel.candidates.size; id++) {
        const candidate = colModel.candidates.candidate(id);
        if (candidate?.rowIndex === rowIndex) return candidate;
      }
      throw new Error(`missing col candidate for row ${String(rowIndex)}`);
    };
    const first = byRow(0);
    const second = byRow(1);
    const keysForCol = (candidate: CandidateFacts): PropertyKey[] =>
      candidate.rowIndex === null ? [] : [String(candidate.rowIndex)];
    const { value, destroy } = withFlushedEffectRoot(() =>
      createSemanticCandidateProjection({
        model: () => colModel,
        candidateSemanticKeys: keysForCol,
        selectedKeys: () => [],
        intervalKeys: () => [],
        intervals: () => [],
        // Emphasis key matches row 0; inspection seeds row 1's primitive.
        emphasisKeys: () => ["0"],
        muteSiblingsOnInspect: () => true,
        inspectionFocus: () => ({
          sourceKeys: [],
          key: null,
          kind: second.kind,
          primitives: [
            {
              batchIndex: second.batchIndex,
              primitiveIndex: second.primitiveIndex,
            },
          ],
        }),
      }),
    );

    expect(first.kind).toBe("rects");
    const mask = value.interactionMasks.find((entry) => entry !== null);
    expect(mask).toBeDefined();
    expect(mask?.isFocused(first.primitiveIndex)).toBe(true);
    expect(mask?.isFocused(second.primitiveIndex)).toBe(true);
    expect(mask?.focusedCount).toBeGreaterThanOrEqual(2);
    destroy();
  });

  it("keeps key masks for batches that rect inspection does not touch", () => {
    // Dual-geom scene: emphasis keys land on points; rect seed is only on cols.
    // unionInteractionMasks must preserve the key-only batch (b === null path).
    const dualModel = modelFor(
      gg(
        [
          { category: "A", count: 10, y2: 1 },
          { category: "B", count: 20, y2: 2 },
          { category: "C", count: 15, y2: 3 },
        ],
        aes({ x: "category", y: "count" }),
      )
        .geomCol()
        .geomPoint({ aes: { y: "y2" } })
        .spec(),
    );
    const rectCandidate = (() => {
      for (let id = 0; id < dualModel.candidates.size; id++) {
        const candidate = dualModel.candidates.candidate(id);
        if (candidate?.kind === "rects" && candidate.rowIndex === 0) return candidate;
      }
      throw new Error("missing rect candidate");
    })();
    const pointCandidate = (() => {
      for (let id = 0; id < dualModel.candidates.size; id++) {
        const candidate = dualModel.candidates.candidate(id);
        if (candidate?.kind === "points" && candidate.rowIndex === 1) return candidate;
      }
      throw new Error("missing point candidate");
    })();
    const keysForDual = (candidate: CandidateFacts): PropertyKey[] => {
      if (candidate.kind === "points" && candidate.rowIndex === 1) return ["point-1"];
      return [];
    };
    const { value, destroy } = withFlushedEffectRoot(() =>
      createSemanticCandidateProjection({
        model: () => dualModel,
        candidateSemanticKeys: keysForDual,
        selectedKeys: () => [],
        intervalKeys: () => [],
        intervals: () => [],
        emphasisKeys: () => ["point-1"],
        muteSiblingsOnInspect: () => true,
        inspectionFocus: () => ({
          sourceKeys: [],
          key: null,
          kind: rectCandidate.kind,
          primitives: [
            {
              batchIndex: rectCandidate.batchIndex,
              primitiveIndex: rectCandidate.primitiveIndex,
            },
          ],
        }),
      }),
    );

    expect(pointCandidate.batchIndex).not.toBe(rectCandidate.batchIndex);
    const pointMask = value.interactionMasks[pointCandidate.batchIndex];
    const rectMask = value.interactionMasks[rectCandidate.batchIndex];
    expect(pointMask?.isFocused(pointCandidate.primitiveIndex)).toBe(true);
    expect(rectMask?.isFocused(rectCandidate.primitiveIndex)).toBe(true);
    destroy();
  });

  it("serves anchors and masks from one semantic Candidate walk", () => {
    let keyCalls = 0;
    const first = candidateForRow(0);
    const second = candidateForRow(1);
    const { value, destroy } = withFlushedEffectRoot(() =>
      createSemanticCandidateProjection({
        model: () => model,
        candidateSemanticKeys: (candidate) => {
          keyCalls++;
          return keysFor(candidate);
        },
        selectedKeys: () => ["0"],
        intervalKeys: () => [],
        intervals: () => [],
        emphasisKeys: () => ["1"],
        inspectionFocus: () => ({ sourceKeys: ["2"], key: null }),
      }),
    );

    expect(value.selectedAnchors).toContainEqual({
      x: first.x,
      y: first.y,
      chrome: "ring",
    });
    expect(value.emphasizedAnchors).toContainEqual({
      x: second.x,
      y: second.y,
      chrome: "ring",
    });
    expect(value.interactionMasks.some((mask) => mask !== null)).toBe(true);
    const callsAfterAllConsumers = keyCalls;
    expect(callsAfterAllConsumers).toBeGreaterThan(0);
    void value.selectedAnchors;
    void value.emphasizedAnchors;
    void value.interactionMasks;
    expect(keyCalls).toBe(callsAfterAllConsumers);
    destroy();
  });

  it("density-gates emphasis rings on dense point series but keeps selection rings", () => {
    // EMPHASIS_RING_DENSITY_LIMIT is 48 — 50 co-emphasized points drop rings;
    // selecting the same 50 keys still draws rings (D2).
    const denseRows = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      x: i,
      y: i % 7,
    }));
    const denseModel = modelFor(
      gg(denseRows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
    );
    const allKeys = denseRows.map((row) => row.id);
    const keysForDense = (candidate: CandidateFacts): PropertyKey[] => {
      if (candidate.rowIndex === null) return [];
      const row = denseRows[candidate.rowIndex];
      return row === undefined ? [] : [row.id];
    };
    const { value, destroy } = withFlushedEffectRoot(() =>
      createSemanticCandidateProjection({
        model: () => denseModel,
        candidateSemanticKeys: keysForDense,
        selectedKeys: () => allKeys,
        intervalKeys: () => [],
        intervals: () => [],
        emphasisKeys: () => allKeys,
        inspectionFocus: () => null,
      }),
    );

    expect(value.emphasizedAnchors.length).toBe(50);
    expect(value.emphasizedAnchors.every((a) => a.chrome === "none")).toBe(true);
    expect(value.selectedAnchors.length).toBe(50);
    expect(value.selectedAnchors.every((a) => a.chrome === "ring")).toBe(true);
    destroy();
  });

  it("uses mute-only chrome for path (line) emphasis anchors", () => {
    const lineModel = modelFor(
      gg(
        [
          { id: "a1", series: "A", x: 1, y: 1 },
          { id: "a2", series: "A", x: 2, y: 3 },
          { id: "b1", series: "B", x: 1, y: 2 },
          { id: "b2", series: "B", x: 2, y: 4 },
        ],
        aes({ x: "x", y: "y", color: "series" }),
      )
        .geomLine()
        .spec(),
    );
    const keysForLine = (candidate: CandidateFacts): PropertyKey[] => {
      if (candidate.rowIndex === null) return [];
      const rows = [
        { id: "a1", series: "A" },
        { id: "a2", series: "A" },
        { id: "b1", series: "B" },
        { id: "b2", series: "B" },
      ];
      const row = rows[candidate.rowIndex];
      return row === undefined ? [] : [row.id];
    };
    const { value, destroy } = withFlushedEffectRoot(() =>
      createSemanticCandidateProjection({
        model: () => lineModel,
        candidateSemanticKeys: keysForLine,
        selectedKeys: () => [],
        intervalKeys: () => [],
        intervals: () => [],
        emphasisKeys: () => ["a1", "a2"],
        inspectionFocus: () => null,
      }),
    );

    expect(value.emphasizedAnchors.length).toBeGreaterThan(0);
    expect(value.emphasizedAnchors.every((a) => a.chrome === "none")).toBe(true);
    expect(value.interactionMasks.some((mask) => mask !== null)).toBe(true);
    destroy();
  });

  it("skips semantic Candidate consumption for union intervals", () => {
    let keyCalls = 0;
    const intervals: readonly PlotInteractionInterval<PropertyKey>[] = [
      {
        panelId: model.scene.panels[0].id,
        preset: "union",
        domains: {},
        keys: ["0"],
      },
    ];
    const { value, destroy } = withFlushedEffectRoot(() =>
      createSemanticCandidateProjection({
        model: () => model,
        candidateSemanticKeys: (candidate) => {
          keyCalls++;
          return keysFor(candidate);
        },
        selectedKeys: () => [],
        intervalKeys: () => [],
        intervals: () => intervals,
        emphasisKeys: () => [],
        inspectionFocus: () => null,
      }),
    );

    expect(value.intervalConsumptionCandidates).toEqual([]);
    expect(keyCalls).toBe(0);
    destroy();
  });

  it("supplies non-union interval consumption without a fallback walk", () => {
    let keyCalls = 0;
    const intervals: readonly PlotInteractionInterval<PropertyKey>[] = [
      { panelId: model.scene.panels[0].id, preset: "independent", domains: {}, keys: [] },
    ];
    const { value, destroy } = withFlushedEffectRoot(() =>
      createSemanticCandidateProjection({
        model: () => model,
        candidateSemanticKeys: (candidate) => {
          keyCalls++;
          return keysFor(candidate);
        },
        selectedKeys: () => [],
        intervalKeys: () => [],
        intervals: () => intervals,
        emphasisKeys: () => [],
        inspectionFocus: () => null,
      }),
    );

    expect(value.intervalConsumptionCandidates.length).toBeGreaterThan(0);
    expect(value.intervalConsumptionCandidates[0]).toMatchObject({
      panelId: model.scene.panels[0].id,
      keys: ["0"],
    });
    expect(keyCalls).toBe(value.intervalConsumptionCandidates.length);
    destroy();
  });

  it("reuses its semantic view when focus keys change but liveness does not", () => {
    const emphasis = reactiveBox<readonly PropertyKey[]>(["0"]);
    let keyCalls = 0;
    const { value, destroy } = withFlushedEffectRoot(() =>
      createSemanticCandidateProjection({
        model: () => model,
        candidateSemanticKeys: (candidate) => {
          keyCalls++;
          return keysFor(candidate);
        },
        selectedKeys: () => [],
        intervalKeys: () => [],
        intervals: () => [],
        emphasisKeys: () => emphasis.value,
        inspectionFocus: () => null,
      }),
    );

    void value.interactionMasks;
    const initialCalls = keyCalls;
    emphasis.set(["1"]);
    flushSync();
    void value.interactionMasks;
    expect(keyCalls).toBe(initialCalls);
    destroy();
  });
});
