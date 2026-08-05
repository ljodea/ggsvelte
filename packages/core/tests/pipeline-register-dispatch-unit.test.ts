/**
 * Unit tests for unregistered geom/stat dispatch error messages (#1420).
 * Spawned process tests exist; these run in-process so coverage attributes.
 */
import { describe, expect, it } from "bun:test";
import { fromPartial } from "@total-typescript/shoehorn";

import { dispatchGeometryBatch } from "../src/pipeline/geometry-dispatch.ts";
import { buildNonIdentityFrame } from "../src/pipeline/frame-stats.ts";
import type { LayerBinding, LayerFrame } from "../src/pipeline/types.ts";
import { PipelineError } from "../src/pipeline/types.ts";
import { ColumnTable } from "../src/table.ts";
import type { Frame } from "../src/pipeline/geometry-shared.ts";
import type { ResolvedStyleScales } from "../src/pipeline/geometry-style.ts";

const table = ColumnTable.fromRows([{ x: 1, y: 2 }]);
const emptyStyles = fromPartial<ResolvedStyleScales>({});
const emptyFx = fromPartial<Frame>({});

function fakeFrame(geom: string): LayerFrame {
  const binding = fromPartial<LayerBinding>({
    index: 3,
    layer: { geom, stat: "identity" },
  });
  return fromPartial<LayerFrame>({
    binding,
    table,
    n: 0,
    xNumeric: new Float64Array(0),
    yNumeric: new Float64Array(0),
    groups: [],
    inputGroups: [],
    rowIndex: new Uint32Array(0),
  });
}

function fakeBinding(stat: string): LayerBinding {
  return fromPartial<LayerBinding>({
    index: 2,
    layer: { geom: "point", stat },
  });
}

describe("dispatchGeometryBatch unregistered geom", () => {
  it("names registerBasic/registerAll for an unknown geom", () => {
    expect(() =>
      dispatchGeometryBatch(fakeFrame("not_a_real_geom"), emptyFx, null, null, emptyStyles, []),
    ).toThrow(
      expect.objectContaining({
        code: "unsupported-param",
        path: "/layers/3/geom",
      } satisfies Partial<PipelineError>),
    );
    try {
      dispatchGeometryBatch(fakeFrame("not_a_real_geom"), emptyFx, null, null, emptyStyles, []);
    } catch (error) {
      const message = (error as PipelineError).message;
      expect(message).toMatch(/not registered in this build/);
      expect(message).toMatch(/registerAll\(\)|registerBasic\(\)/);
      expect(message).toMatch(/registerGeomBatch\("not_a_real_geom"/);
    }
  });
});

describe("buildNonIdentityFrame unregistered stat", () => {
  it("returns null for identity without looking up a builder", () => {
    expect(buildNonIdentityFrame(fakeBinding("identity"), table, [], [], [])).toBeNull();
  });

  it("names registerBasic/registerAll for an unknown stat", () => {
    expect(() => buildNonIdentityFrame(fakeBinding("not_a_real_stat"), table, [], [], [])).toThrow(
      expect.objectContaining({
        code: "unsupported-param",
        path: "/layers/2/stat",
      } satisfies Partial<PipelineError>),
    );
    try {
      buildNonIdentityFrame(fakeBinding("not_a_real_stat"), table, [], [], []);
    } catch (error) {
      const message = (error as PipelineError).message;
      expect(message).toMatch(/not registered in this build/);
      expect(message).toMatch(/registerAll\(\)|registerBasic\(\)/);
      expect(message).toMatch(/registerStatFrame\("not_a_real_stat"/);
    }
  });
});
