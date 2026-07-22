import { describe, expect, it, vi } from "vitest";

import { runPipeline } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

// Barrel path characterization: production + tests historically import via resolver.js
import { resolveInspection } from "../../src/lib/inspection/resolver.js";

describe("inspection snapshot resolve", () => {
  it("uses one core grouped target for focus, legend order, fields, and lineage", () => {
    const data = [
      { id: "a1", x: 1, y: 3, series: "a" },
      { id: "b1", x: 1, y: 7, series: "b" },
      { id: "a2", x: 2, y: 4, series: "a" },
      { id: "b2", x: 2, y: 8, series: "b" },
    ];
    const spec = gg(data, aes({ x: "x", y: "y", color: "series" }))
      .geomLine()
      .spec();
    const model = runPipeline(spec, { width: 480, height: 320 });
    const seed = model.candidates.candidate(0)!;
    const inspection = resolveInspection({
      model,
      seed,
      mode: "x",
      state: "transient",
      source: "pointer",
      keyOf: (row) => row.id as string,
    });
    expect(inspection.mode).toBe("x");
    expect(inspection.axisValue).toBe(1);
    expect(inspection.members).toHaveLength(2);
    expect(inspection.members.map((member) => member.key)).toEqual(["a1", "b1"]);
    expect(inspection.members).toContain(inspection.focus);
    expect(inspection.focus.lineageCount).toBe(1);
    model.dispose();
  });
  it("falls back to a single-member snapshot when axis grouping has no bucket", () => {
    const model = runPipeline(
      gg([{ id: "a", x: 1, y: 2 }], aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      { width: 300, height: 200 },
    );
    const seed = model.candidates.candidate(0)!;
    // group() owns bucket validity; force a null group so resolveInspection's
    // total fallback materializes a single-member axis snapshot.
    vi.spyOn(model.candidates, "group").mockReturnValue(null);
    const inspection = resolveInspection({
      model,
      seed: { ...seed, xValue: null, yValue: null },
      mode: "x",
      state: "pinned",
      source: "keyboard",
      keyOf: (row) => row.id as string,
    });
    expect(inspection.mode).toBe("x");
    expect(inspection.members).toHaveLength(1);
    expect(inspection.focus.key).toBe("a");
    expect(inspection.axisValue).toBeNull();
    expect(inspection.axisLabel).toBe("–");
    model.dispose();
  });
  it("dedups aggregate sourceKeys in first-seen order and skips null keyOf results", () => {
    // keyOf maps: skip → null, a2 → "a", b2 → "b", else id.
    // Unique non-null keys are {a,b,c}; order follows first lineage appearance.
    const data = [
      { id: "a", g: "g" },
      { id: "skip", g: "g" },
      { id: "b", g: "g" },
      { id: "a2", g: "g" },
      { id: "c", g: "g" },
      { id: "b2", g: "g" },
    ];
    const model = runPipeline(
      {
        data: { values: data },
        layers: [{ geom: "bar", aes: { x: { field: "g" } } }],
      },
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    const keyOf = (row: { id: string }): string | null => {
      if (row.id === "skip") return null;
      if (row.id === "a2") return "a";
      if (row.id === "b2") return "b";
      return row.id;
    };
    // Oracle: first-seen non-null keys along the published lineage order.
    const firstSeen: string[] = [];
    for (const rowIndex of model.lineage.keys(seed.lineage)) {
      const row = model.row(rowIndex) as { id: string } | null;
      if (row === null) continue;
      const key = keyOf(row);
      if (key !== null && !firstSeen.includes(key)) firstSeen.push(key);
    }
    expect(new Set(firstSeen)).toEqual(new Set(["a", "b", "c"]));
    expect(firstSeen).toHaveLength(3);

    const inspection = resolveInspection({
      model,
      seed,
      mode: "exact",
      state: "transient",
      source: "pointer",
      keyOf: (row) => keyOf(row as { id: string }),
    });
    expect(inspection.focus.sourceKeys).toEqual(firstSeen);
    expect(inspection.focus.lineageCount).toBe(6);
    model.dispose();
  });
  it("materializes all-unique large lineage sourceKeys in first-seen order", () => {
    const n = 2_000;
    const data = Array.from({ length: n }, (_, index) => ({
      id: `row-${index}`,
      g: "g",
    }));
    const model = runPipeline(
      {
        data: { values: data },
        layers: [{ geom: "bar", aes: { x: { field: "g" } } }],
      },
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    expect(model.lineage.count(seed.lineage)).toBe(n);
    const lineageRows = model.lineage.keys(seed.lineage);
    const firstId = (model.row(lineageRows[0]) as { id: string }).id;
    const lastId = (model.row(lineageRows[n - 1]) as { id: string }).id;

    const inspection = resolveInspection({
      model,
      seed,
      mode: "exact",
      state: "transient",
      source: "pointer",
      keyOf: (row) => row.id as string,
    });
    expect(inspection.focus.sourceKeys).toHaveLength(n);
    expect(inspection.focus.sourceKeys[0]).toBe(firstId);
    expect(inspection.focus.sourceKeys[n - 1]).toBe(lastId);
    model.dispose();
  });
  it("allocates a membership Set when materializing aggregate sourceKeys", () => {
    const data = Array.from({ length: 40 }, (_, index) => ({
      id: `row-${index}`,
      g: "g",
    }));
    const model = runPipeline(
      {
        data: { values: data },
        layers: [{ geom: "bar", aes: { x: { field: "g" } } }],
      },
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    const RealSet = globalThis.Set;
    let constructions = 0;
    globalThis.Set = class CountingSet<T> extends RealSet<T> {
      constructor(iterable?: Iterable<T>) {
        super(iterable);
        constructions += 1;
      }
    } as SetConstructor;
    try {
      const inspection = resolveInspection({
        model,
        seed,
        mode: "exact",
        state: "transient",
        source: "pointer",
        keyOf: (row) => row.id as string,
      });
      expect(inspection.focus.sourceKeys).toHaveLength(40);
      expect(constructions).toBeGreaterThanOrEqual(1);
    } finally {
      globalThis.Set = RealSet;
      model.dispose();
    }
  });
});
