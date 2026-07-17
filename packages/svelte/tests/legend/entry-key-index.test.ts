/**
 * Spec for the legend entry-key-index service (S16).
 *
 * Red-first in commit 2 (module missing → vitest/check fail); GREEN once
 * legend/entry-key-index.svelte.ts lands. Pins the S13 access contract:
 * reactive legendEntryKeyIndex getter + keysForLegend re-resolve on model change.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { runPipeline, type RenderModel } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

// Intentionally missing until commit 3 — RED module resolution failure.
import { createLegendEntryKeyIndex } from "../../src/lib/legend/entry-key-index.svelte.js";
import { withFlushedEffectRoot } from "../helpers/effect-root.svelte.js";
import { reactiveBox } from "../helpers/reactive-box.svelte.js";

const defaultAes: Parameters<typeof aes>[0] = { x: "x", y: "y", color: "id" };
const defaultSize = { width: 400, height: 300 };

/** Point-geom model with a discrete color legend (mirrors semantic-keys suite). */
const buildPointModel = (
  data: { id: string; x: number; y: number }[],
  aesSpec: Parameters<typeof aes>[0] = defaultAes,
  size: { width: number; height: number } = defaultSize,
): RenderModel => runPipeline(gg(data, aes(aesSpec)).geomPoint().spec(), size);

describe("createLegendEntryKeyIndex", () => {
  it("returns the index Map for a discrete legend, keysForLegend resolves entries, both re-resolve on model change, and null model is empty", () => {
    // ACCESS CONTRACT (S13-pinned): legendEntryKeyIndex is a reactive getter
    // (not a plain property snapshot). Mutating the model dep must refresh BOTH
    // the getter and keysForLegend — a snapped Map would leave both paths stale.
    const dataA = [
      { id: "a", x: 1, y: 10 },
      { id: "b", x: 2, y: 20 },
    ];
    const dataB = [
      { id: "c", x: 3, y: 30 },
      { id: "d", x: 4, y: 40 },
    ];
    // Stub per-row keys: mirror semanticKeys.keys.get(i) / keyAt(i).
    const stubKeys: (PropertyKey | null)[] = ["a", "b"];
    const modelBox = reactiveBox<RenderModel | null>(buildPointModel(dataA));

    const { value: service, destroy } = withFlushedEffectRoot(() =>
      createLegendEntryKeyIndex({
        model: () => modelBox.value,
        keyAt: (i) => stubKeys[i] ?? null,
      }),
    );

    const action = {
      identity: { scale: "color", entryIndex: 0 },
      entry: { value: "a", label: "a" },
      source: "keyboard" as const,
    };

    // (a) Discrete color legend → non-empty index Map via getter.
    const indexBefore = service.legendEntryKeyIndex;
    expect(indexBefore.size).toBeGreaterThan(0);
    // (b) keysForLegend resolves entry identity → key arrays.
    const keysBefore = service.keysForLegend(action);
    expect(keysBefore).toEqual(["a"]);
    // Snapshot identity of the Map itself — a plain property would pin this.
    const mapRefBefore = indexBefore;

    // (c) Model dep change re-resolves BOTH access paths.
    const previous = modelBox.value;
    stubKeys[0] = "c";
    stubKeys[1] = "d";
    modelBox.set(buildPointModel(dataB));
    flushSync();

    const indexAfter = service.legendEntryKeyIndex;
    const keysAfter = service.keysForLegend(action);
    expect(indexAfter).not.toBe(mapRefBefore);
    // Keys for entry 0 follow the new model categories (c, not a).
    expect(keysAfter).toEqual(["c"]);

    previous?.dispose();
    modelBox.value?.dispose();

    // (d) empty/null model → empty index, empty keys.
    modelBox.set(null);
    flushSync();
    expect(service.legendEntryKeyIndex.size).toBe(0);
    expect(service.keysForLegend(action)).toEqual([]);

    destroy();
  });
});
