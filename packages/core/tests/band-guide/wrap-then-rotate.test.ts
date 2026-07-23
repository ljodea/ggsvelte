import { describe, expect, it } from "bun:test";

import { plan, measurer } from "./fixtures.ts";

/** #637: wrap fails, full-string −45° truncates; hybrid wrap-then−45° keeps full text. */
const LONG_CATS = [
  "Resolución",
  "Corrección (errores o erratas)",
  "Sentencia",
  "Orden",
  "Otro",
] as const;

/** #634 desktop fixture — hybrid must not steal the wrap rung. */
const MIXED_OUTLIER = [
  "Real Decreto",
  "Orden",
  "Ley",
  "Resolución",
  "Corrección (errores o erratas)",
  "Sentencia",
  "Directiva",
  "Reglamento",
] as const;

describe("planBandAxis: wrap-then−45° hybrid (#637)", () => {
  it("at 240px prefers wrap-then−45° over full-string −45°+truncate", () => {
    // wrap fails (unbreakable tokens / plane overlap). Full-string −45 needs the
    // bottom cap to truncate the 4-token outlier. Hybrid balances that label onto
    // ≤2 shorter lines, rotates at −45°, and keeps every glyph of fullLabel.
    const p = plan([...LONG_CATS], 240);
    expect(p.mode).toBe("rotated");
    expect(p.angle).toBe(-45);
    expect(p.ticks.every((t) => t.labeled)).toBe(true);
    expect(p.ticks.every((t) => t.angle === -45)).toBe(true);

    const long = p.ticks.find((t) => t.value === "Corrección (errores o erratas)");
    expect(long).toBeDefined();
    expect(long!.lines).toBeDefined();
    expect(long!.lines!.length).toBeGreaterThan(1);
    expect(long!.lines!.length).toBeLessThanOrEqual(2);
    expect(long!.lines!.join(" ")).toBe("Corrección (errores o erratas)");
    expect(long!.label.includes("…")).toBe(false);
    expect(p.degraded).not.toContain("band-label-margin-overflow");

    // Hybrid ortho uses shorter lines than full-string −45 (≈111px → overflow).
    const lineH = measurer.measureHeight(11);
    const fullStringOrtho =
      measurer.measureWidth("Corrección (errores o erratas)", 11) * Math.SQRT1_2 +
      lineH * Math.SQRT1_2;
    expect(p.labelBandHeight).toBeLessThan(fullStringOrtho);
    // Still a real rotated band — not a flat two-line wrap height.
    expect(p.labelBandHeight).toBeGreaterThan(lineH * 2);
  });

  it("still wraps at desktop 640 (#634 regression) — hybrid only when wrap cannot", () => {
    const p = plan([...MIXED_OUTLIER], 640);
    expect(p.mode).toBe("wrapped");
    expect(p.angle).toBe(0);
    const long = p.ticks.find((t) => t.value === "Corrección (errores o erratas)");
    expect(long!.lines?.join(" ") ?? long!.label).toBe("Corrección (errores o erratas)");
    expect(long!.angle === undefined || long!.angle === 0).toBe(true);
  });

  it("keeps a uniform axis mode (no mix of wrap vs rotate ticks)", () => {
    const p = plan([...LONG_CATS], 240);
    expect(p.mode).toBe("rotated");
    const angles = new Set(p.ticks.map((t) => t.angle ?? 0));
    expect(angles.size).toBe(1);
    // Short labels may be single-line under the shared −45° mode.
    expect(p.ticks.every((t) => (t.lines?.length ?? 1) >= 1)).toBe(true);
  });
});
