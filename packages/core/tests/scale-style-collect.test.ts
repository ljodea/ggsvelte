/**
 * Style aesthetic value collection for scale training.
 *
 * Large mapped style columns must not be spread into Array.prototype.push —
 * that hits the engine argument limit and throws RangeError (#1338). Match the
 * colour path: iterate and push one element at a time.
 */
import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

import { collectStyleValues } from "../src/pipeline/scale-style-collect.ts";
import type { LayerBinding, LayerFrame } from "../src/pipeline/types.js";
import { ColumnTable } from "../src/table.js";

function sizeBinding(overrides: Partial<LayerBinding["size"]> = {}): LayerBinding {
  return fromAny<LayerBinding>({
    layer: { geom: "point", aes: {} },
    index: 0,
    xField: "x",
    yField: "y",
    color: { field: null, constant: null, scaledConstant: null },
    fill: { field: null, constant: null, scaledConstant: null },
    size: { field: "s", statColumn: null, constant: null, scaledConstant: null, ...overrides },
    linewidth: { field: null, statColumn: null, constant: null, scaledConstant: null },
    alpha: { field: null, statColumn: null, constant: null, scaledConstant: null },
    shape: { field: null, statColumn: null, constant: null, scaledConstant: null },
    linetype: { field: null, statColumn: null, constant: null, scaledConstant: null },
    ruleForm: null,
  });
}

describe("collectStyleValues", () => {
  it("preserves mapped order and appends scaled constants", () => {
    const table = ColumnTable.fromRows([{ x: 1, y: 1, s: 1 }]);
    const binding = sizeBinding();
    const frame = fromAny<LayerFrame>({
      binding,
      table,
      n: 3,
      sizeValues: [1, 2, 3],
    });
    const constantBinding = sizeBinding({
      field: null,
      scaledConstant: 99,
    });
    const constantFrame = fromAny<LayerFrame>({
      binding: constantBinding,
      table,
      n: 1,
      sizeValues: null,
    });
    const result = collectStyleValues({
      aesthetic: "size",
      frames: [frame, constantFrame],
      bindings: [binding, constantBinding],
      table,
      sourceTable: table,
    });
    expect(result.values).toEqual([1, 2, 3, 99]);
  });

  it("collects a style column past the engine spread argument limit", () => {
    // Engine argument limit is runtime-specific. On Bun 1.3.x here, bare
    // push(...arr) succeeds at 5e5 and throws at 1e6. Pin n to a size that
    // actually throws under spread on *this* runtime so the test stays red
    // without the fix and green with it.
    const n = 1_000_000;
    // Prove the engine still rejects a row-length spread into push on this
    // runtime so the regression test stays meaningful if limits change.
    const bulk = Array.from({ length: n }, () => 0);
    expect(() => {
      Array.prototype.push.apply([], bulk);
    }).toThrow(RangeError);

    // Prefer Float64Array: size/linewidth/alpha often arrive as typed columns.
    const mapped = new Float64Array(n);
    for (let i = 0; i < n; i++) mapped[i] = i % 50;

    // Keep the field branch cheap: has() false so we only exercise the push path.
    const table = fromAny({
      has: () => false,
      discreteness: () => "continuous",
    });
    const binding = sizeBinding();
    const frame = fromAny<LayerFrame>({
      binding,
      table,
      n,
      sizeValues: mapped,
    });

    const result = collectStyleValues({
      aesthetic: "size",
      frames: [frame],
      bindings: [binding],
      table: table as never,
      sourceTable: table as never,
    });
    expect(result.values.length).toBe(n);
    expect(result.values[0]).toBe(0);
    expect(result.values[n - 1]).toBe((n - 1) % 50);
    expect(result.anyField).toBe(true);
  });
});
