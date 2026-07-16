/**
 * Characterization tests for post-bind frame building (stats → LayerFrame).
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { bindLayer } from "../src/pipeline/bind.ts";
import { buildFrame, remapSourceRows } from "../src/pipeline/frame.ts";
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
