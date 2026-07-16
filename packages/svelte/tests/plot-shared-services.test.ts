/**
 * Unit tests for plot shared services (announcer + semantic keys).
 * Factories own effects — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { runPipeline, type RenderModel } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

import {
  createPlotAnnouncer,
  createSemanticKeyService,
} from "../src/lib/plot-shared-services.svelte.js";
import { withEffectRoot, withFlushedEffectRoot } from "./helpers/effect-root.svelte.js";

const rows = [
  { id: "a", x: 1, y: 10 },
  { id: "b", x: 2, y: 20 },
];

function minimalModel(): RenderModel {
  return runPipeline(
    gg(rows, aes({ x: "x", y: "y", color: "id" }))
      .geomPoint()
      .spec(),
    {
      width: 400,
      height: 300,
    },
  );
}

describe("createPlotAnnouncer", () => {
  it("announce clears then sets after a microtask (live-region re-announce)", async () => {
    const announcer = createPlotAnnouncer();
    expect(announcer.text).toBe("");
    announcer.announce("hello");
    expect(announcer.text).toBe("");
    await Promise.resolve();
    expect(announcer.text).toBe("hello");
    announcer.announce("hello");
    expect(announcer.text).toBe("");
    await Promise.resolve();
    expect(announcer.text).toBe("hello");
  });
});

describe("createSemanticKeyService", () => {
  it("keeps stable identity across a data-preserving re-render", () => {
    let model = minimalModel();
    const data = rows;
    const spec = undefined;
    const { sourceIdentity } = (() => {
      const ids = new WeakMap<object, number>();
      let next = 1;
      return {
        sourceIdentity(value: unknown): string {
          if ((typeof value !== "object" && typeof value !== "function") || value === null)
            return String(value);
          let id = ids.get(value);
          if (id === undefined) {
            id = next++;
            ids.set(value, id);
          }
          return String(id);
        },
      };
    })();

    const { value: service, destroy } = withFlushedEffectRoot(() =>
      createSemanticKeyService({
        model: () => model,
        assembled: () => ({
          data: rows,
          layers: [{ geom: "point" }],
          aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "id" } },
        }),
        datumKey: () => "id",
        data: () => data,
        spec: () => spec,
        sourceIdentity,
        deliverDiagnostic: () => {},
      }),
    );

    const first = [service.keyAt(0), service.keyAt(1)];
    expect(first).toEqual(["a", "b"]);

    // Data-preserving re-render: new model, same source identity tokens.
    const previous = model;
    model = minimalModel();
    flushSync();
    expect([service.keyAt(0), service.keyAt(1)]).toEqual(first);
    previous.dispose();
    model.dispose();
    destroy();
  });

  it("delivers diagnostics once per change (behavior, not implementation)", () => {
    let model: RenderModel | null = runPipeline(
      gg(
        [
          { id: "a", x: 1, y: 1 },
          { id: "a", x: 2, y: 2 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .spec(),
      { width: 200, height: 200 },
    );
    const diagnostics: string[] = [];
    const data = [
      { id: "a", x: 1, y: 1 },
      { id: "a", x: 2, y: 2 },
    ];

    const { destroy } = withFlushedEffectRoot(() =>
      createSemanticKeyService({
        model: () => model,
        assembled: () => ({
          data,
          layers: [{ geom: "point" }],
          aes: { x: { field: "x" }, y: { field: "y" } },
        }),
        datumKey: () => "id",
        data: () => data,
        spec: () => null,
        sourceIdentity: String,
        deliverDiagnostic: (d) => {
          diagnostics.push(d.code);
        },
      }),
    );

    expect(diagnostics.length).toBeGreaterThan(0);
    const afterFirst = diagnostics.length;
    // Re-flush without changing keys must not re-deliver.
    flushSync();
    expect(diagnostics.length).toBe(afterFirst);
    model?.dispose();
    model = null;
    destroy();
  });

  it("does not invoke deps during construction", () => {
    let calls = 0;
    const counting = <T>(value: T) => {
      calls++;
      return value;
    };
    const model = minimalModel();
    const { destroy } = withEffectRoot(() =>
      createSemanticKeyService({
        model: () => counting(model),
        assembled: () => counting(null),
        datumKey: () => counting("id" as const),
        data: () => counting(rows),
        spec: () => counting(null),
        sourceIdentity: (v) => {
          calls++;
          return String(v);
        },
        deliverDiagnostic: () => {
          calls++;
        },
      }),
    );
    expect(calls).toBe(0);
    destroy();
    model.dispose();
  });
});
