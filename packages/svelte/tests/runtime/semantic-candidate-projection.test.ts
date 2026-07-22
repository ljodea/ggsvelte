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

  it("builds interaction masks from keyless rect inspection primitives", () => {
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
