/**
 * Characterization tests for per-layer pipeline contracts: backends,
 * tooltip field maps, and scaled-constant legend-focus values.
 */
import { describe, expect, it } from "bun:test";

import {
  resolveLayerBackends,
  resolveLayerFields,
  resolveLayerScaledConstants,
} from "../src/pipeline/layer-contracts.ts";
import { bindLayer } from "../src/pipeline/bind.ts";
import type { Advisory } from "../src/pipeline/types.ts";
import { ColumnTable } from "../src/table.ts";
import type { GeometryBatch } from "../src/scene.ts";
import type { LayerSpec } from "@ggsvelte/spec";

const table = ColumnTable.fromRows([
  { x: 1, y: 10, g: "a" },
  { x: 2, y: 20, g: "b" },
]);

function pointLayers(): LayerSpec[] {
  return [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }];
}

function emptyPoints(n: number, layerIndex = 0): GeometryBatch {
  return {
    kind: "points",
    layerIndex,
    panelIndex: 0,
    positions: new Float32Array(n * 2),
    rowIndex: new Uint32Array(n),
    size: 2,
    alpha: 1,
    shape: "circle",
    fill: null,
  };
}

describe("resolveLayerBackends", () => {
  it("defaults auto layers under threshold to svg", () => {
    const advisories: Advisory[] = [];
    const backends = resolveLayerBackends(
      pointLayers(),
      [emptyPoints(10)],
      undefined,
      2000,
      advisories,
    );
    expect(backends).toEqual(["svg"]);
    expect(advisories).toHaveLength(0);
  });

  it("auto-switches to canvas above threshold with advisory", () => {
    const advisories: Advisory[] = [];
    const backends = resolveLayerBackends(
      pointLayers(),
      [emptyPoints(50)],
      undefined,
      10,
      advisories,
    );
    expect(backends).toEqual(["canvas"]);
    expect(advisories.some((a) => a.code === "canvas-auto")).toBe(true);
  });

  it("force-svg overrides canvas auto", () => {
    const advisories: Advisory[] = [];
    const backends = resolveLayerBackends(
      pointLayers(),
      [emptyPoints(50)],
      "force-svg",
      10,
      advisories,
    );
    expect(backends).toEqual(["svg"]);
    expect(advisories).toHaveLength(0);
  });

  it("honors explicit render hints", () => {
    const layers: LayerSpec[] = [
      { geom: "point", aes: { x: { field: "x" }, y: { field: "y" } }, render: "canvas" },
    ];
    expect(resolveLayerBackends(layers, [emptyPoints(1)], undefined, 2000, [])).toEqual(["canvas"]);
  });
});

describe("resolveLayerFields", () => {
  it("maps identity field channels for tooltips", () => {
    const binding = bindLayer(
      { geom: "point", aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "g" } } },
      0,
      table,
      [],
    );
    const fields = resolveLayerFields(1, [binding]);
    const labels = fields[0]!.map((f) => `${f.channel}:${f.field}`);
    expect(labels).toContain("x:x");
    expect(labels).toContain("y:y");
    expect(labels).toContain("color:g");
  });

  it("marks count-stat y as stat source", () => {
    const binding = bindLayer(
      {
        geom: "bar",
        aes: { x: { field: "g" }, y: { stat: "count" } },
        stat: "count",
      },
      0,
      table,
      [],
    );
    const fields = resolveLayerFields(1, [binding])[0]!;
    const y = fields.find((f) => f.channel === "y");
    expect(y?.field).toBe("count");
    expect(y?.source).toBe("stat");
  });

  it("pads empty bindings to declared layer count (empty-data contract)", () => {
    const fields = resolveLayerFields(2, []);
    expect(fields).toHaveLength(2);
    expect(fields[0]).toEqual([]);
    expect(fields[1]).toEqual([]);
  });
});

describe("resolveLayerScaledConstants", () => {
  it("captures scaled constant color/fill values", () => {
    const binding = bindLayer(
      {
        geom: "point",
        aes: {
          x: { field: "x" },
          y: { field: "y" },
          color: { value: "steelblue", scale: true },
        },
      },
      0,
      table,
      [],
    );
    const constants = resolveLayerScaledConstants(1, [binding]);
    expect(constants[0]?.["color"]).toBe("steelblue");
  });

  it("captures scaled style constants for legend focus/filter keys", () => {
    const binding = bindLayer(
      {
        geom: "point",
        aes: {
          x: { field: "x" },
          y: { field: "y" },
          shape: { value: "A", scale: true },
          size: { value: 4, scale: true },
        },
      },
      0,
      table,
      [],
    );
    const constants = resolveLayerScaledConstants(1, [binding]);
    expect(constants[0]?.["shape"]).toBe("A");
    expect(constants[0]?.["size"]).toBe(4);
  });

  it("pads empty bindings to declared layer count (empty-data contract)", () => {
    const constants = resolveLayerScaledConstants(2, []);
    expect(constants).toHaveLength(2);
    expect(constants[0]).toEqual({});
    expect(constants[1]).toEqual({});
  });
});
