/**
 * A discrete size legend must grow its swatch so the largest size key renders
 * at its true radius. Both renderers cap a size key at swatchSize/2, so a fixed
 * 10px swatch collapses every radius above 5px to an identical dot — distinct
 * large size keys would look the same while the plotted marks differ.
 */
import { describe, expect, it } from "bun:test";

import { FONT_METRICS } from "../src/layout/font-metrics.ts";
import { MetricsTableMeasurer } from "../src/layout/measure.ts";
import { buildLegends, type DiscreteLegendInput } from "../src/legend.ts";

const measurer = new MetricsTableMeasurer(FONT_METRICS);

function sizeInput(entries: readonly { label: string; radius: number }[]): DiscreteLegendInput {
  const labels = entries.map((entry) => entry.label);
  const radii = new Map(entries.map((entry) => [entry.label, entry.radius]));
  return {
    kind: "discrete",
    scale: "size",
    title: "",
    domain: labels,
    firstSeen: labels,
    keyOf: (value) => ({ size: radii.get(value as string) ?? 0 }),
  };
}

describe("discrete size legend swatch sizing", () => {
  it("grows the swatch so large size keys are not clamped to an identical radius", () => {
    // Radii 6 and 9 both exceed the old fixed 5px cap (swatchSize/2 with a 10px
    // swatch) and would collapse to identical dots.
    const block = buildLegends(
      [
        sizeInput([
          { label: "small", radius: 2 },
          { label: "mid", radius: 6 },
          { label: "large", radius: 9 },
        ]),
      ],
      "stable-domain",
      measurer,
      400,
    );
    const legend = block.legends[0]!;
    expect(legend.type).toBe("discrete");
    if (legend.type !== "discrete") return;
    const maxRadius = Math.max(...legend.entries.map((entry) => entry.size ?? 0));
    expect(maxRadius).toBe(9);
    // swatchSize/2 must reach the largest radius so the renderers'
    // Math.min(swatchSize/2, entry.size) cap never binds.
    expect(legend.swatchSize / 2).toBeGreaterThanOrEqual(maxRadius);
    // Every key's rendered radius (post-cap) stays distinct.
    const rendered = legend.entries.map((entry) =>
      Math.min(legend.swatchSize / 2, entry.size ?? legend.swatchSize / 2),
    );
    expect(new Set(rendered).size).toBe(legend.entries.length);
    expect(rendered).toEqual([2, 6, 9]);
  });

  it("keeps the default 10px swatch when no size key exceeds 5px", () => {
    const block = buildLegends(
      [
        sizeInput([
          { label: "a", radius: 3 },
          { label: "b", radius: 4 },
        ]),
      ],
      "stable-domain",
      measurer,
      400,
    );
    const legend = block.legends[0]!;
    if (legend.type !== "discrete") throw new Error("expected discrete legend");
    expect(legend.swatchSize).toBe(10);
  });
});
