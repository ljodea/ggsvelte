import { describe, expect, it } from "bun:test";

import { plan } from "./fixtures.ts";

const longCats = ["Resolución", "Corrección (errores o erratas)", "Sentencia", "Orden", "Otro"];

describe("planBandAxis: author guide pins (#407)", () => {
  it("mode:single pins single-line even when auto would wrap", () => {
    const auto = plan(longCats, 480);
    expect(auto.mode).toBe("wrapped");
    const pinned = plan(longCats, 480, { config: { mode: "single" } });
    expect(pinned.mode).toBe("single-line");
    expect(pinned.angle).toBe(0);
    expect(pinned.authorPinned).toBe(true);
    expect(pinned.ticks.every((t) => t.lines === undefined)).toBe(true);
  });

  it("mode:single reports neighbour overlap instead of silently clean", () => {
    // Same width where auto wraps due to collisions — forced single must flag.
    const pinned = plan(longCats, 480, { config: { mode: "single" } });
    expect(pinned.mode).toBe("single-line");
    expect(pinned.overlap).toBe(true);
    expect(pinned.degraded).toContain("band-label-overlap");
  });

  it("mode:single measures overlap after end-label truncation", () => {
    // Full pre-truncation widths collide; side-cap ellipsis shortens the ends so
    // rendered labels clear each other. Using entry widths would false-positive.
    const cats = ["VERYLONGLABEL", "A", "VERYLONGLABEL"];
    const pinned = plan(cats, 120, {
      config: { mode: "single" },
      marginCapPx: 8,
      orthogonalMarginCapPx: 200,
    });
    expect(pinned.mode).toBe("single-line");
    expect(pinned.marginOverflow).toBe(true);
    expect(pinned.ticks.some((t, i) => t.label !== cats[i])).toBe(true);
    expect(pinned.overlap).toBe(false);
    expect(pinned.degraded).not.toContain("band-label-overlap");
  });

  it("mode:wrap pins wrap even when auto would stay single-line", () => {
    const short = ["IT", "HR", "Ops", "Sales"];
    expect(plan(short, 480).mode).toBe("single-line");
    const pinned = plan(short, 480, { config: { mode: "wrap" } });
    expect(pinned.mode).toBe("wrapped");
    expect(pinned.authorPinned).toBe(true);
    expect(pinned.ticks.every((t) => (t.lines?.length ?? 0) >= 1)).toBe(true);
  });

  it("mode:wrap reports orthogonal overflow when forced tall wrap exceeds cap", () => {
    const pinned = plan(longCats, 480, {
      config: { mode: "wrap", wrap: 8 },
      orthogonalMarginCapPx: 8, // far below multi-line wrap height
    });
    expect(pinned.mode).toBe("wrapped");
    expect(pinned.marginOverflow).toBe(true);
    expect(pinned.degraded).toContain("band-label-margin-overflow");
    // Reserved height still clamped to the orthogonal cap.
    expect(pinned.labelBandHeight).toBeLessThanOrEqual(8 + 1e-6);
  });

  it("mode:wrap reports side overflow when wrap footprint exceeds margin cap", () => {
    // One very long unbreakable token forced to wrap as a single over-wide line.
    const pinned = plan(["Anlageverwaltungsgesellschaftsvertrag", "A", "B"], 120, {
      config: { mode: "wrap" },
      marginCapPx: 4,
      orthogonalMarginCapPx: 200,
    });
    expect(pinned.mode).toBe("wrapped");
    expect(pinned.marginOverflow).toBe(true);
    expect(pinned.degraded).toContain("band-label-margin-overflow");
    expect(pinned.alongOverhang + pinned.leftOverhang).toBeLessThanOrEqual(4 + 4 + 1e-6);
  });

  it("mode:rotate + angle pins rotation degrees", () => {
    const pinned = plan(longCats, 480, { config: { mode: "rotate", angle: -90 } });
    expect(pinned.mode).toBe("rotated");
    expect(pinned.angle).toBe(-90);
    expect(pinned.authorPinned).toBe(true);
    expect(pinned.ticks.every((t) => t.angle === -90)).toBe(true);
  });

  it("normalizes unsupported positive / out-of-range rotation angles", () => {
    expect(plan(longCats, 240, { config: { mode: "rotate", angle: 45 } }).angle).toBe(-45);
    expect(plan(longCats, 240, { config: { mode: "rotate", angle: 135 } }).angle).toBe(-90);
    expect(plan(longCats, 240, { config: { mode: "rotate", angle: -120 } }).angle).toBe(-90);
    expect(plan(longCats, 240, { config: { mode: "rotate", angle: 0 } }).angle).toBe(0);
  });

  it("mode:off hides every label and reserves no band height", () => {
    const pinned = plan(longCats, 480, { config: { mode: "off" } });
    expect(pinned.ticks.every((t) => !t.labeled)).toBe(true);
    expect(pinned.labelBandHeight).toBe(0);
    expect(pinned.degraded).toEqual([]);
    expect(pinned.authorPinned).toBe(true);
  });

  it("mode:off works for vertical orientation (coord_flip / y-band)", () => {
    const pinned = plan(longCats, 480, {
      config: { mode: "off" },
      orient: "vertical",
    });
    expect(pinned.ticks.every((t) => !t.labeled)).toBe(true);
    expect(pinned.labelBandHeight).toBe(0);
  });

  it("guide.wrap is honored as the max wrap line budget", () => {
    const cats = ["North region", "South region", "East region"];
    const oneLine = plan(cats, 480, { config: { mode: "wrap", wrap: 1 } });
    expect(oneLine.mode).toBe("wrapped");
    expect(oneLine.ticks.every((t) => (t.lines?.length ?? 0) <= 1)).toBe(true);

    const twoLines = plan(["Corrección (errores o erratas)", "Resolución", "Sentencia"], 200, {
      config: { mode: "wrap", wrap: 2 },
      orthogonalMarginCapPx: 200,
    });
    expect(twoLines.mode).toBe("wrapped");
    expect(twoLines.ticks.every((t) => (t.lines?.length ?? 0) <= 2)).toBe(true);
  });

  it("mode:wrap keeps capped multi-line layout when labels need more than wrap lines", () => {
    // Multi-word label that needs >2 lines on a narrow band; forced wrap must
    // not collapse back to a single full-width line.
    const label = "one two three four five six seven eight";
    // extent 150 → band ~50px: words fit individually but need >2 wrap lines.
    const pinned = plan([label, "A", "B"], 150, {
      config: { mode: "wrap", wrap: 2 },
      orthogonalMarginCapPx: 200,
      marginCapPx: 40,
    });
    expect(pinned.mode).toBe("wrapped");
    const lines = pinned.ticks[0]?.lines;
    expect(lines).toBeDefined();
    expect(lines!.length).toBeGreaterThan(1);
    expect(lines!.length).toBeLessThanOrEqual(2);
    // Collapsing to the full label as one line would produce a single-line pin.
    expect(lines![0]).not.toBe(label);
    expect(lines!.join(" ")).toBe(label);
  });

  it("auto + guide.angle uses the pinned angle when escalating to rotate", () => {
    const pinned = plan(longCats, 240, { config: { angle: -45 } });
    expect(pinned.mode).toBe("rotated");
    expect(pinned.angle).toBe(-45);
    // Angle-only pin still uses auto escalation — not a mode pin.
    expect(pinned.authorPinned).toBeUndefined();
  });
});
