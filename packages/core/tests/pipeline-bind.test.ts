/**
 * Characterization tests for data/layer binding extracted from the pipeline.
 * Pins structured error codes and successful channel resolution contracts.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { bindData, bindLayer } from "../src/pipeline/bind.ts";
import { PipelineError, runPipeline } from "../src/pipeline.ts";
import { ColumnTable } from "../src/table.ts";

const size = { width: 640, height: 400 };
const table = ColumnTable.fromRows([
  { x: 1, y: 10, g: "a" },
  { x: 2, y: 20, g: "b" },
]);

describe("bindData", () => {
  it("binds inline values data", () => {
    const t = bindData({ data: { values: [{ a: 1 }] }, layers: [] }, { width: 100, height: 100 });
    expect(t.rowCount).toBe(1);
    expect(t.has("a")).toBe(true);
  });

  it("throws no-data when the spec has no data ref", () => {
    try {
      bindData({ layers: [] }, { width: 100, height: 100 });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("no-data");
    }
  });

  it("throws unknown-dataset for missing named data", () => {
    try {
      bindData({ data: { name: "missing" }, layers: [] }, { width: 100, height: 100 });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("unknown-dataset");
    }
  });

  it("resolves RunOptions.data by name", () => {
    const t = bindData(
      { data: { name: "cars" }, layers: [] },
      {
        width: 100,
        height: 100,
        data: { cars: [{ displ: 1.8, hwy: 29 }] },
      },
    );
    expect(t.rowCount).toBe(1);
    expect(t.has("displ")).toBe(true);
  });

  it("throws dataset-collision without allowOverride", () => {
    try {
      bindData(
        {
          data: { name: "cars" },
          datasets: { cars: { values: [{ x: 1 }] } },
          layers: [],
        },
        {
          width: 100,
          height: 100,
          data: { cars: [{ x: 2 }] },
        },
      );
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("dataset-collision");
    }
  });
});

describe("bindLayer", () => {
  it("resolves point layer field mappings", () => {
    const warnings: { code: string; message: string }[] = [];
    const binding = bindLayer(
      { geom: "point", aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "g" } } },
      0,
      table,
      warnings,
    );
    expect(binding.xField).toBe("x");
    expect(binding.yField).toBe("y");
    expect(binding.color.field).toBe("g");
    expect(binding.ruleForm).toBeNull();
  });

  it("throws missing-channel when point lacks y", () => {
    try {
      bindLayer({ geom: "point", aes: { x: { field: "x" } } }, 0, table, []);
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("missing-channel");
      expect((e as PipelineError).path).toContain("y");
    }
  });

  it("throws unknown-field for missing columns", () => {
    try {
      bindLayer({ geom: "point", aes: { x: { field: "nope" }, y: { field: "y" } } }, 0, table, []);
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("unknown-field");
    }
  });

  it("rejects data-mapped y on bar geom", () => {
    try {
      bindLayer({ geom: "bar", aes: { x: { field: "g" }, y: { field: "y" } } }, 0, table, []);
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("computed-y-mapped");
    }
  });

  it("classifies rule annotation vs data-driven forms", () => {
    const ann = bindLayer({ geom: "rule", params: { yintercept: 5 } }, 0, table, []);
    expect(ann.ruleForm).toBe("annotation");

    const vert = bindLayer({ geom: "rule", aes: { x: { field: "x" } } }, 0, table, []);
    expect(vert.ruleForm).toBe("vertical");
  });
});

describe("bind via runPipeline (regression anchors)", () => {
  it("unknown-field surfaces as PipelineError from the public entry", () => {
    try {
      runPipeline(
        gg([{ x: 1 }], aes({ x: "missing", y: "x" }))
          .geomPoint()
          .spec(),
        size,
      );
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("unknown-field");
    }
  });
});
