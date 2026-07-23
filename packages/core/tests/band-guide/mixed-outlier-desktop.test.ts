import { describe, expect, it } from "bun:test";

import { plan, measurer } from "./fixtures.ts";

/** #634 repro: low-cardinality legal document types, one four-token outlier. */
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

describe("planBandAxis: mixed short + one multi-word outlier (#634)", () => {
  it("wraps at desktop width 640 instead of −90° + truncate", () => {
    // Today: rotated −90 with ellipsis on the long label — presentation failure.
    // Preferred rung: wrapped, full text visible, short labels stay horizontal.
    const p = plan([...MIXED_OUTLIER], 640);
    expect(p.mode).toBe("wrapped");
    expect(p.angle).toBe(0);
    expect(p.ticks.every((t) => t.labeled)).toBe(true);
    expect(p.ticks.every((t) => !(t.angle !== undefined && t.angle !== 0))).toBe(true);

    const long = p.ticks.find((t) => t.value === "Corrección (errores o erratas)");
    expect(long).toBeDefined();
    expect(long!.label.includes("…")).toBe(false);
    expect(long!.fullLabel).toBe("Corrección (errores o erratas)");
    // Displayed lines (or joined label) preserve the full category string.
    const shown = long!.lines?.join(" ") ?? long!.label;
    expect(shown).toBe("Corrección (errores o erratas)");
    expect((long!.lines?.length ?? 1) <= 2).toBe(true);

    // Bottom band stays a two-line wrap, not a −90 crush.
    const lineH = measurer.measureHeight(11);
    expect(p.labelBandHeight).toBeLessThanOrEqual(lineH * 2 + 1);
    expect(p.degraded).not.toContain("band-label-margin-overflow");
  });

  it("still wraps (not −90°+truncate) across the 560–680 failure window", () => {
    for (const width of [560, 600, 640, 680]) {
      const p = plan([...MIXED_OUTLIER], width);
      expect(p.mode).toBe("wrapped");
      const long = p.ticks.find((t) => t.value === "Corrección (errores o erratas)");
      expect(long!.label.includes("…")).toBe(false);
      expect(long!.lines?.join(" ") ?? long!.label).toBe("Corrección (errores o erratas)");
    }
  });
});
