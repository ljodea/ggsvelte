/**
 * buildFrame density / smooth / boxplot / summary characterization.
 */
import { describe, expect, it } from "bun:test";

import { bindLayer } from "../../src/pipeline/bind.ts";
import { buildFrame } from "../../src/pipeline/frame.ts";
import { ColumnTable } from "../../src/table.ts";
import type { Advisory, PipelineWarning } from "../../src/pipeline/types.ts";

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
