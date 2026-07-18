/**
 * Characterization tests for post-bind frame building (stats → LayerFrame).
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { bindLayer } from "../src/pipeline/bind.ts";
import { buildFrame, deriveLayerGroups, remapSourceRows } from "../src/pipeline/frame.ts";
import { runPipeline } from "../src/pipeline.ts";
import { NO_ROW } from "../src/pipeline/types.ts";
import { ColumnTable } from "../src/table.ts";
import type { Advisory, PipelineWarning } from "../src/pipeline/types.ts";

const size = { width: 640, height: 400 };

describe("buildFrame — identity", () => {
  it("maps source rows through identity stat", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const warnings: PipelineWarning[] = [];
    const advisories: Advisory[] = [];
    const binding = bindLayer(
      { geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } },
      0,
      table,
      warnings,
    );
    const frame = buildFrame(binding, table, warnings, advisories);
    expect(frame.n).toBe(2);
    expect([...frame.rowIndex]).toEqual([0, 1]);
    expect(frame.xNumeric?.[0]).toBe(1);
    expect(frame.yNumeric?.[1]).toBe(20);
    expect(frame.box).toBeNull();
  });
});

describe("buildFrame — count stat", () => {
  it("synthesizes NO_ROW indices and count y for bar", () => {
    const table = ColumnTable.fromRows([{ g: "a" }, { g: "a" }, { g: "b" }]);
    const warnings: PipelineWarning[] = [];
    const binding = bindLayer(
      {
        geom: "bar",
        aes: { x: { field: "g" }, y: { stat: "count" } },
        stat: "count",
      },
      0,
      table,
      warnings,
    );
    const frame = buildFrame(binding, table, warnings, []);
    expect(frame.n).toBe(2);
    expect([...frame.rowIndex].every((r) => r === NO_ROW)).toBe(true);
    // counts: a=2, b=1 (order is first-seen)
    expect(frame.yNumeric).not.toBeNull();
    expect([...frame.yNumeric!].toSorted((a, b) => a - b)).toEqual([1, 2]);
  });
});

describe("buildFrame — annotation rules", () => {
  it("stores intercepts with zero data rows", () => {
    const table = ColumnTable.fromRows([{ x: 1, y: 2 }]);
    const binding = bindLayer(
      { geom: "rule", params: { yintercept: [1, 2], xintercept: 0.5 } },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    expect(frame.n).toBe(0);
    expect(frame.yIntercepts).toEqual([1, 2]);
    expect(frame.xIntercepts).toEqual([0.5]);
  });

  it("keeps inputGroups empty over a non-empty source table", () => {
    // Annotation frames are rowless (n=0); pre-stat groups must stay empty so
    // the identity index does not retain O(source rows) memberships for them.
    const table = ColumnTable.fromRows([
      { x: 1, y: 2, g: "a" },
      { x: 2, y: 3, g: "b" },
      { x: 3, y: 4, g: "a" },
    ]);
    const binding = bindLayer(
      { geom: "rule", params: { yintercept: 1 }, aes: { color: { field: "g" } } },
      0,
      table,
      [],
    );
    expect(binding.ruleForm).toBe("annotation");
    const frame = buildFrame(binding, table, [], []);
    expect(frame.n).toBe(0);
    expect(frame.inputGroups).toEqual([]);
  });
});

describe("buildFrame — bin default advisory", () => {
  it("emits bin-default-bins when bins are not configured", () => {
    const table = ColumnTable.fromRows(Array.from({ length: 40 }, (_, i) => ({ x: i, y: 1 })));
    const warnings: PipelineWarning[] = [];
    const advisories: Advisory[] = [];
    const binding = bindLayer(
      {
        geom: "bar",
        aes: { x: { field: "x" }, y: { stat: "count" } },
        stat: "bin",
      },
      0,
      table,
      warnings,
    );
    buildFrame(binding, table, warnings, advisories);
    expect(advisories.some((a) => a.code === "bin-default-bins")).toBe(true);
  });
});

describe("remapSourceRows", () => {
  it("rewrites local panel rows to source rows, leaving NO_ROW alone", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
    const binding = bindLayer(
      { geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    frame.rowIndex[0] = 0;
    frame.rowIndex[1] = NO_ROW;
    remapSourceRows(frame, [10, 20]);
    expect(frame.rowIndex[0]).toBe(10);
    expect(frame.rowIndex[1]).toBe(NO_ROW);
  });
});

describe("buildFrame — density / smooth / boxplot / summary", () => {
  it("density produces continuous x and ymin/ymax from zero baseline", () => {
    const table = ColumnTable.fromRows(
      Array.from({ length: 30 }, (_, i) => ({ x: i + Math.random(), y: 1 })),
    );
    const binding = bindLayer(
      { geom: "density", aes: { x: { field: "x" } }, stat: "density" },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    expect(frame.n).toBeGreaterThan(0);
    expect(frame.xNumeric).not.toBeNull();
    expect(frame.yNumeric).not.toBeNull();
    expect(frame.ymin).not.toBeNull();
    expect(frame.ymax).not.toBeNull();
    expect([...frame.ymin!].every((v) => v === 0)).toBe(true);
  });

  it("density drops singleton groups with a warning", () => {
    const table = ColumnTable.fromRows([
      { x: 1, g: "a" },
      { x: 2, g: "a" },
      { x: 3, g: "b" }, // singleton group
    ]);
    const warnings: PipelineWarning[] = [];
    const binding = bindLayer(
      {
        geom: "density",
        aes: { x: { field: "x" }, group: { field: "g" } },
        stat: "density",
      },
      0,
      table,
      warnings,
    );
    buildFrame(binding, table, warnings, []);
    expect(warnings.some((w) => w.code === "density-group-dropped")).toBe(true);
  });

  it("smooth emits fitted y and optional band advisories path", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 8 },
      { x: 5, y: 9 },
    ]);
    const advisories: Advisory[] = [];
    const binding = bindLayer(
      { geom: "smooth", aes: { x: { field: "x" }, y: { field: "y" } }, stat: "smooth" },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], advisories);
    expect(frame.n).toBeGreaterThan(0);
    expect(frame.xNumeric).not.toBeNull();
    expect(frame.yNumeric).not.toBeNull();
    // method may be inferred when not set
    expect(
      advisories.length === 0 || advisories.some((a) => a.code === "smooth-method-inferred"),
    ).toBe(true);
  });

  it("boxplot stores box hinges and outlier arrays", () => {
    const table = ColumnTable.fromRows([
      { g: "a", y: 1 },
      { g: "a", y: 2 },
      { g: "a", y: 3 },
      { g: "a", y: 4 },
      { g: "a", y: 10 },
    ]);
    const binding = bindLayer(
      {
        geom: "boxplot",
        aes: { x: { field: "g" }, y: { field: "y" } },
        stat: "boxplot",
      },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    expect(frame.n).toBe(1);
    expect(frame.box).not.toBeNull();
    expect(frame.box!.lower.length).toBe(1);
    expect(frame.box!.middle.length).toBe(1);
    expect(frame.box!.upper.length).toBe(1);
    expect(frame.ymin).not.toBeNull();
    expect(frame.ymax).not.toBeNull();
  });

  it("summary produces y/ymin/ymax for mean_se style fun", () => {
    const table = ColumnTable.fromRows([
      { g: "a", y: 1 },
      { g: "a", y: 3 },
      { g: "b", y: 5 },
      { g: "b", y: 7 },
    ]);
    const binding = bindLayer(
      {
        geom: "errorbar",
        aes: { x: { field: "g" }, y: { field: "y" } },
        stat: "summary",
        params: { fun: "mean", funMin: "mean_se", funMax: "mean_se" },
      },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    expect(frame.n).toBe(2);
    expect(frame.yNumeric).not.toBeNull();
    expect(frame.ymin).not.toBeNull();
    expect(frame.ymax).not.toBeNull();
  });
});

describe("buildFrame via runPipeline (regression)", () => {
  it("count bars produce one rect batch with expected mark count", () => {
    const model = runPipeline(
      gg([{ g: "a" }, { g: "a" }, { g: "b" }], aes({ x: "g" }))
        .geomBar()
        .spec(),
      size,
    );
    const rects = model.scene.batches.filter((b) => b.kind === "rects");
    expect(rects.length).toBeGreaterThan(0);
  });
});

describe("buildFrame — pre-stat inputGroups (issue #217)", () => {
  it("retains pre-stat groups on identity frames (same as post-stat groups)", () => {
    const table = ColumnTable.fromRows([
      { x: "a", c: "red", y: 1 },
      { x: "b", c: "blue", y: 2 },
      { x: "a", c: "red", y: 3 },
    ]);
    const binding = bindLayer(
      {
        geom: "point",
        aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "c" } },
      },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    const expected = deriveLayerGroups(binding, table);
    // Known first-seen group ids for discrete x × color (decision 0005).
    expect(expected).toEqual([0, 1, 0]);
    expect([...frame.inputGroups]).toEqual([0, 1, 0]);
    expect([...frame.groups]).toEqual([0, 1, 0]);
  });

  it("retains pre-stat groups on count frames (distinct from post-stat groups)", () => {
    // Two source rows share (g, fill) so count collapses 4 rows → 3 marks.
    const table = ColumnTable.fromRows([
      { g: "a", fill: "x" },
      { g: "a", fill: "x" },
      { g: "a", fill: "y" },
      { g: "b", fill: "x" },
    ]);
    const binding = bindLayer(
      {
        geom: "bar",
        aes: { x: { field: "g" }, fill: { field: "fill" }, y: { stat: "count" } },
        stat: "count",
      },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    // Pre-stat: one id per source row; post-stat: one id per aggregated mark.
    expect(frame.inputGroups).toHaveLength(table.rowCount);
    expect(frame.groups).toHaveLength(frame.n);
    expect(frame.n).toBe(3);
    expect(frame.n).toBeLessThan(table.rowCount);
    expect([...frame.inputGroups]).toEqual(deriveLayerGroups(binding, table));
    // First-seen interaction of discrete x × fill: a|x=0, a|y=1, b|x=2.
    expect([...frame.inputGroups]).toEqual([0, 0, 1, 2]);
  });
});
