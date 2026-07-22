import { describe, expect, it } from "bun:test";

import { plan, measurer } from "./fixtures.ts";

describe("planBandAxis: escalation ladder", () => {
  it("short labels stay on a single line with no degradation", () => {
    const p = plan(["IT", "HR", "Ops", "Sales"], 480);
    expect(p.mode).toBe("single-line");
    expect(p.angle).toBe(0);
    expect(p.degraded).toEqual([]);
    expect(p.ticks.every((t) => t.labeled)).toBe(true);
    expect(p.ticks.every((t) => t.lines === undefined || t.lines.length === 1)).toBe(true);
    // A single line of labels needs one line-height of bottom band.
    expect(p.labelBandHeight).toBeLessThanOrEqual(measurer.measureHeight(11) + 1);
  });

  it("wraps multi-word labels to at most two lines, keeping every category", () => {
    // The issue's repro at 480px (band ≈ 96px): the long labels overflow one line
    // but wrap into ≤2 lines that fit the band — the readable, no-drop outcome.
    const p = plan(
      ["Resolución", "Corrección (errores o erratas)", "Sentencia", "Orden", "Otro"],
      480,
    );
    expect(p.mode).toBe("wrapped");
    expect(p.ticks.every((t) => t.labeled)).toBe(true);
    expect(p.ticks.every((t) => (t.lines?.length ?? 1) <= 2)).toBe(true);
    // Two lines reserve more than one line-height.
    expect(p.labelBandHeight).toBeGreaterThan(measurer.measureHeight(11));
  });

  it("reuses wrap lines and widths (no second wrap/measure pass on emit)", () => {
    // Pre-fix re-wrapped every label for tick emission and re-measured line
    // widths for overlap + side reserve (~41 measureWidth calls). Cached path
    // stays well under that for the same fixture.
    let measureWidthCalls = 0;
    const counting = {
      measureWidth: (text: string, fontSizePx: number) => {
        measureWidthCalls++;
        return measurer.measureWidth(text, fontSizePx);
      },
      measureHeight: (fontSizePx: number) => measurer.measureHeight(fontSizePx),
    };
    const p = plan(
      ["Resolución", "Corrección (errores o erratas)", "Sentencia", "Orden", "Otro"],
      480,
      { measurer: counting },
    );
    expect(p.mode).toBe("wrapped");
    expect(measureWidthCalls).toBeLessThanOrEqual(30);
    expect(measureWidthCalls).toBeGreaterThan(0);
  });

  it("rotates long labels rather than dropping any category", () => {
    // Same labels at 240px (band ≈ 48px): "Corrección" alone exceeds the band, so
    // wrapping is impossible — escalate to rotation, still labelling every bar.
    const p = plan(
      ["Resolución", "Corrección (errores o erratas)", "Sentencia", "Orden", "Otro"],
      240,
    );
    expect(p.mode).toBe("rotated");
    expect([-45, -90]).toContain(p.angle);
    expect(p.ticks.every((t) => t.labeled)).toBe(true);
    expect(p.ticks.every((t) => t.angle === p.angle)).toBe(true);
  });

  it("measures each rotated labeled tick once for height and overhang", () => {
    // Pre-fix: shownMaxWidth pass + overhang pass each called measureWidth
    // per labeled tick (~30 total on this fixture). Single-pass is ~25.
    let measureWidthCalls = 0;
    const counting = {
      measureWidth: (text: string, fontSizePx: number) => {
        measureWidthCalls++;
        return measurer.measureWidth(text, fontSizePx);
      },
      measureHeight: (fontSizePx: number) => measurer.measureHeight(fontSizePx),
    };
    const p = plan(
      ["Resolución", "Corrección (errores o erratas)", "Sentencia", "Orden", "Otro"],
      240,
      { measurer: counting },
    );
    expect(p.mode).toBe("rotated");
    expect(measureWidthCalls).toBeLessThanOrEqual(27);
    expect(measureWidthCalls).toBeGreaterThan(0);
  });

  it("uses a uniform mode across the whole axis (no ragged mix)", () => {
    const p = plan(["A", "Corrección (errores o erratas)", "B", "C"], 480);
    const angles = new Set(p.ticks.map((t) => t.angle ?? 0));
    expect(angles.size).toBe(1);
  });

  it("truncates a single over-long token only as a last resort, keeping its tick", () => {
    // One un-wrappable token, narrow band, short orthogonal cap => rotate can't fit => truncate.
    const p = plan(["Anlageverwaltungsgesellschaftsvertrag", "Kurz", "Mittel"], 200, {
      orthogonalMarginCapPx: 40,
    });
    expect(p.degraded).toContain("band-label-margin-overflow");
    expect(p.ticks.every((t) => t.labeled)).toBe(true); // every category still labelled
    const long = p.ticks.find((t) => t.value === "Anlageverwaltungsgesellschaftsvertrag");
    expect(long?.label.endsWith("…")).toBe(true);
  });
});
