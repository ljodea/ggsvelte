/**
 * Unit seams for paintVector / mappedPaintVector / constantStyle (#1041).
 * Expected colors are independent palette literals, not re-derived from colorOf.
 */
import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import {
  constantStyle,
  mappedPaintIndexVector,
  mappedPaintVector,
  paintVector,
} from "../../src/pipeline/geometry-style.ts";
import { DEFAULT_MISSING_COLOR } from "../../src/scales/engine.ts";
import type { CellValue } from "../../src/table.ts";
import type { LayerBinding, LayerFrame, ResolvedColorScale } from "../../src/pipeline/types.ts";

const PALETTE: Record<string, string> = {
  a: "#ff0000",
  b: "#00ff00",
  c: "#0000ff",
  scaled: "#abcdef",
};

function stubScale(map: Record<string, string> = PALETTE): ResolvedColorScale {
  return fromPartial<ResolvedColorScale>({
    kind: "ordinal",
    scale: {
      colorOf: (value: unknown) =>
        value === null || value === undefined ? undefined : map[`${value as string | number}`],
      naValue: DEFAULT_MISSING_COLOR,
      unknownValue: DEFAULT_MISSING_COLOR,
    },
  });
}

function makeFrame(partial: {
  colorValues?: LayerFrame["colorValues"];
  fillValues?: LayerFrame["fillValues"];
  color?: Partial<LayerBinding["color"]>;
  fill?: Partial<LayerBinding["fill"]>;
  alpha?: Partial<LayerBinding["alpha"]>;
  linewidth?: Partial<LayerBinding["linewidth"]>;
}): LayerFrame {
  const emptyStyle = {
    field: null,
    statColumn: null,
    constant: null,
    scaledConstant: null,
  };
  return fromPartial<LayerFrame>({
    colorValues: partial.colorValues ?? null,
    fillValues: partial.fillValues ?? null,
    binding: {
      color: {
        field: null,
        constant: null,
        scaledConstant: null,
        ...partial.color,
      },
      fill: {
        field: null,
        constant: null,
        scaledConstant: null,
        ...partial.fill,
      },
      alpha: { ...emptyStyle, ...partial.alpha },
      linewidth: { ...emptyStyle, ...partial.linewidth },
    },
  });
}

describe("mappedPaintVector", () => {
  it("indexes mapped color values by kept-row order", () => {
    const frame = makeFrame({ colorValues: ["a", "b", "c"] });
    const scale = stubScale();
    expect(mappedPaintVector(frame, "color", scale, [0, 2])).toEqual(["#ff0000", "#0000ff"]);
  });

  it("uses scaledConstant when the values column is null", () => {
    const frame = makeFrame({
      colorValues: null,
      color: { scaledConstant: "scaled" },
    });
    expect(mappedPaintVector(frame, "color", stubScale(), [0, 1])).toEqual(["#abcdef", "#abcdef"]);
  });

  it("resolves fill channel values", () => {
    const frame = makeFrame({ fillValues: ["a", "c"] });
    expect(mappedPaintVector(frame, "fill", stubScale(), [1])).toEqual(["#0000ff"]);
  });

  it("maps null cells to the scale NA color", () => {
    const frame = makeFrame({ colorValues: [null, "a"] });
    expect(mappedPaintVector(frame, "color", stubScale(), [0, 1])).toEqual([
      DEFAULT_MISSING_COLOR,
      "#ff0000",
    ]);
  });

  it("resolves the scale once per unique value when fanning out (#1423)", () => {
    let colorOfCalls = 0;
    const scale = fromPartial<ResolvedColorScale>({
      kind: "ordinal",
      scale: {
        colorOf: (value: unknown) => {
          colorOfCalls++;
          return value === null || value === undefined
            ? undefined
            : PALETTE[`${value as string | number}`];
        },
        naValue: DEFAULT_MISSING_COLOR,
        unknownValue: DEFAULT_MISSING_COLOR,
      },
    });
    // 6 rows, 2 unique values → 2 colorOf calls (not 6).
    const frame = makeFrame({ colorValues: ["a", "b", "a", "b", "a", "b"] });
    expect(mappedPaintVector(frame, "color", scale, [0, 1, 2, 3, 4, 5])).toEqual([
      "#ff0000",
      "#00ff00",
      "#ff0000",
      "#00ff00",
      "#ff0000",
      "#00ff00",
    ]);
    expect(colorOfCalls).toBe(2);
  });

  it("skips unique memoization for all-distinct continuous columns (#1449 Devin)", () => {
    let colorOfCalls = 0;
    const scale = fromPartial<ResolvedColorScale>({
      kind: "sequential",
      scale: {
        colorOf: (value: unknown) => {
          colorOfCalls++;
          // Distinct hex per value so output equality is observable.
          const n = typeof value === "number" ? value : 0;
          const ch = (n % 256).toString(16).padStart(2, "0");
          return `#${ch}${ch}${ch}`;
        },
        naValue: DEFAULT_MISSING_COLOR,
        unknownValue: DEFAULT_MISSING_COLOR,
      },
    });
    // 600 distinct numbers (> probe length × high-cardinality ratio) →
    // direct path: one colorOf per row, not Map growth to 600 entries.
    const values = Array.from({ length: 600 }, (_, i) => i);
    const frame = makeFrame({ colorValues: values });
    const rows = Array.from({ length: 600 }, (_, i) => i);
    const painted = mappedPaintVector(frame, "color", scale, rows);
    expect(painted).toHaveLength(600);
    expect(painted[0]).toBe("#000000");
    expect(painted[255]).toBe("#ffffff");
    expect(colorOfCalls).toBe(600);
  });
});

describe("mappedPaintIndexVector", () => {
  it("packs low-cardinality colors as a palette plus per-row indexes", () => {
    const frame = makeFrame({ colorValues: ["a", "b", "a", "c", "b"] });
    const packed = mappedPaintIndexVector(frame, "color", stubScale(), [0, 1, 2, 3, 4]);
    expect(packed).not.toBeNull();
    expect(packed!.palette).toEqual(["#ff0000", "#00ff00", "#0000ff"]);
    expect([...packed!.indexes]).toEqual([0, 1, 0, 2, 1]);
  });

  it("expands to the same colors as mappedPaintVector", () => {
    const frame = makeFrame({ colorValues: ["a", "b", "c", "a"] });
    const scale = stubScale();
    const rows = [0, 1, 2, 3];
    const packed = mappedPaintIndexVector(frame, "color", scale, rows);
    const strings = mappedPaintVector(frame, "color", scale, rows);
    expect(packed).not.toBeNull();
    expect([...packed!.indexes].map((id) => packed!.palette[id])).toEqual(strings);
  });

  it("returns null for high-cardinality continuous columns", () => {
    const values = Array.from({ length: 600 }, (_, i) => i);
    const frame = makeFrame({ colorValues: values });
    const rows = Array.from({ length: 600 }, (_, i) => i);
    const scale = fromPartial<ResolvedColorScale>({
      kind: "sequential",
      scale: {
        colorOf: (value: unknown) => `#${String(value)}`,
        naValue: DEFAULT_MISSING_COLOR,
        unknownValue: DEFAULT_MISSING_COLOR,
      },
    });
    expect(mappedPaintIndexVector(frame, "color", scale, rows)).toBeNull();
  });
});

describe("paintVector", () => {
  it("matches mappedPaintVector when the channel is mapped", () => {
    const frame = makeFrame({ colorValues: ["a", "b", "c"] });
    const scale = stubScale();
    const rows = [0, 2];
    expect(paintVector(frame, "color", scale, rows)).toEqual(
      mappedPaintVector(frame, "color", scale, rows),
    );
  });

  it("falls through to the literal constant when scale is null", () => {
    const frame = makeFrame({ color: { constant: "#111111" } });
    expect(paintVector(frame, "color", null, [0, 1])).toEqual(["#111111", "#111111"]);
  });

  it("falls through to the literal constant when scale is present but unmapped", () => {
    const frame = makeFrame({
      colorValues: null,
      color: { constant: "#222222", scaledConstant: null },
    });
    expect(paintVector(frame, "color", stubScale(), [0])).toEqual(["#222222"]);
  });

  it("returns null constants when unmapped and constant is null", () => {
    const frame = makeFrame({ fill: { constant: null } });
    expect(paintVector(frame, "fill", null, [0, 1])).toEqual([null, null]);
  });

  it("uses scaledConstant over the literal constant when mapped", () => {
    const frame = makeFrame({
      colorValues: null,
      color: { constant: "#111111", scaledConstant: "scaled" },
    });
    expect(paintVector(frame, "color", stubScale(), [0])).toEqual(["#abcdef"]);
  });
});

describe("constantStyle", () => {
  it("prefers a numeric binding constant over params and fallback", () => {
    const binding = makeFrame({ alpha: { constant: 0.4 } }).binding;
    expect(constantStyle(binding, { alpha: 0.9 }, "alpha", 1)).toBe(0.4);
  });

  it("uses params when the binding constant is not a number", () => {
    const binding = makeFrame({ alpha: { constant: null } }).binding;
    expect(constantStyle(binding, { alpha: 0.7 }, "alpha", 1)).toBe(0.7);
  });

  it("uses the explicit fallback when neither binding nor params provide a number", () => {
    const binding = makeFrame({ linewidth: { constant: null } }).binding;
    expect(constantStyle(binding, {}, "linewidth", 0)).toBe(0);
    expect(constantStyle(binding, {}, "linewidth", 1.5)).toBe(1.5);
  });

  it("ignores non-number binding constants", () => {
    const nonNumber: CellValue = "nope";
    const binding = makeFrame({ alpha: { constant: nonNumber } }).binding;
    expect(constantStyle(binding, { alpha: 0.2 }, "alpha", 1)).toBe(0.2);
  });
});
