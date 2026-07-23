/**
 * Bin lineage missing-edges fallback (issue #218).
 */
import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";
import { ColumnTable } from "../../src/table.ts";

describe("buildBinLineageBuckets missing-edges fallback (issue #218)", () => {
  async function loadBuildBinLineageBuckets() {
    const { buildBinLineageBuckets } =
      await import("../../src/pipeline/candidate-construction/identity-buckets.ts");
    return buildBinLineageBuckets;
  }

  function binBinding(colorField: string | null = null) {
    return {
      layer: {
        geom: "histogram",
        stat: "bin",
        aes: {
          x: { field: "x" },
          ...(colorField === null ? {} : { color: { field: colorField } }),
        },
      },
      index: 0,
      xField: "x",
      yField: null,
      yStatColumn: null,
      yminField: null,
      ymaxField: null,
      xminField: null,
      xmaxField: null,
      color: { field: colorField, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      labelField: null,
      labelConstant: null,
      weightField: null,
      ruleForm: null,
    };
  }

  it("assigns every source row of a group into each of that group's frame rows", async () => {
    const buildBinLineageBuckets = await loadBuildBinLineageBuckets();
    const table = ColumnTable.fromRows([
      { g: "a", x: 1 },
      { g: "b", x: 2 },
      { g: "a", x: 3 },
      { g: "b", x: 4 },
      { g: "a", x: 5 },
    ]);
    // Pre-stat groups: a→0, b→1 (matches frame.inputGroups cache contract).
    const inputGroups = [0, 1, 0, 1, 0];
    // Two empty-edge output marks per group (0=a, 1=b).
    const groups = [0, 0, 1, 1];
    const frame = fromAny({
      binding: binBinding("g"),
      table,
      n: groups.length,
      groups,
      inputGroups,
      inputSourceRows: [0, 1, 2, 3, 4],
      xmin: null,
      xmax: null,
    });
    const sourceRowsByGroupBin = new Map<string, number[]>();
    buildBinLineageBuckets({
      frame,
      panelIndex: 0,
      layerIndex: 0,
      sourceRowsByGroupBin,
    });

    expect(sourceRowsByGroupBin.get("0:0:0:0")).toEqual([0, 2, 4]);
    expect(sourceRowsByGroupBin.get("0:0:0:1")).toEqual([0, 2, 4]);
    expect(sourceRowsByGroupBin.get("0:0:1:2")).toEqual([1, 3]);
    expect(sourceRowsByGroupBin.get("0:0:1:3")).toEqual([1, 3]);
  });

  it("uses finalized inputSourceRows for global lineage ids", async () => {
    const buildBinLineageBuckets = await loadBuildBinLineageBuckets();
    const table = ColumnTable.fromRows([
      { g: "a", x: 1 },
      { g: "a", x: 2 },
      { g: "b", x: 3 },
    ]);
    const inputGroups = [0, 0, 1];
    const groups = [0, 1];
    const frame = fromAny({
      binding: binBinding("g"),
      table,
      n: groups.length,
      groups,
      inputGroups,
      inputSourceRows: [10, 20, 30],
      xmin: null,
      xmax: null,
    });
    const sourceRowsByGroupBin = new Map<string, number[]>();
    buildBinLineageBuckets({
      frame,
      panelIndex: 2,
      layerIndex: 1,
      sourceRowsByGroupBin,
    });

    expect(sourceRowsByGroupBin.get("2:1:0:0")).toEqual([10, 20]);
    expect(sourceRowsByGroupBin.get("2:1:1:1")).toEqual([30]);
  });

  it("reads frame.groups O(k) times, not O(n·k), when edges are missing", async () => {
    const buildBinLineageBuckets = await loadBuildBinLineageBuckets();
    const n = 40;
    const k = 40;
    const table = ColumnTable.fromRows(Array.from({ length: n }, (_, i) => ({ x: i })));
    const inputGroups = Array.from({ length: n }, () => 0);
    const rawGroups = Array.from({ length: k }, () => 0);
    let groupIndexReads = 0;
    const groups = new Proxy(rawGroups, {
      get(target, property, receiver): unknown {
        if (typeof property === "string" && /^\d+$/.test(property)) groupIndexReads += 1;
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
    const frame = fromAny({
      binding: binBinding(null),
      table,
      n: k,
      groups,
      inputGroups,
      inputSourceRows: Array.from({ length: n }, (_, i) => i),
      xmin: null,
      xmax: null,
    });
    const sourceRowsByGroupBin = new Map<string, number[]>();
    buildBinLineageBuckets({
      frame,
      panelIndex: 0,
      layerIndex: 0,
      sourceRowsByGroupBin,
    });

    // Setup walk over k frame rows is enough; nested O(n·k) would read ~n·k times.
    expect(groupIndexReads).toBeLessThanOrEqual(k * 2);
    expect(groupIndexReads).toBeLessThan((n * k) / 2);
    expect(sourceRowsByGroupBin.get("0:0:0:0")).toEqual(Array.from({ length: n }, (_, i) => i));
    expect(sourceRowsByGroupBin.get(`0:0:0:${k - 1}`)).toEqual(
      Array.from({ length: n }, (_, i) => i),
    );
  });
});
