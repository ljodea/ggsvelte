import { describe, expect, it } from "bun:test";

import { FONT_METRICS } from "../src/layout/font-metrics.ts";
import { MetricsTableMeasurer } from "../src/layout/measure.ts";
import {
  buildLegends,
  type DiscreteLegendInput,
  type RampLegendInput,
  type StepsLegendInput,
} from "../src/legend.ts";

const measurer = new MetricsTableMeasurer(FONT_METRICS);

function ramp(direction: "horizontal" | "vertical", title = ""): RampLegendInput {
  return {
    kind: "ramp",
    scale: "color",
    title,
    domain: [0, 10],
    at: (t) => (t === 0 ? "low" : t === 1 ? "high" : `mid-${String(t)}`),
    format: String,
    ticks: [0, 10],
    appearance: {
      type: "colorbar",
      title,
      order: 0,
      position: direction === "horizontal" ? "bottom" : "right",
      direction,
    },
  };
}

function steps(direction: "horizontal" | "vertical", count = 2): StepsLegendInput {
  return {
    kind: "steps",
    scale: "fill",
    title: "Bins",
    entries: Array.from({ length: count }, (_, index) => ({
      label: `bin-${String(index)}`,
      color: `color-${String(index)}`,
    })),
    appearance: {
      type: "colorsteps",
      title: "Bins",
      order: 0,
      position: direction === "horizontal" ? "bottom" : "right",
      direction,
    },
  };
}

function discrete(overrides: Partial<DiscreteLegendInput> = {}): DiscreteLegendInput {
  return {
    kind: "discrete",
    scale: "color",
    title: "Groups",
    domain: ["alpha", "beta"],
    firstSeen: ["alpha", "beta"],
    colorOf: () => "#123456",
    ...overrides,
  };
}

describe("responsive legend regressions", () => {
  it("orients colorbar stops with the ramp direction", () => {
    const horizontal = buildLegends([ramp("horizontal")], "stable-domain", measurer, 240, 320)
      .legends[0];
    const vertical = buildLegends([ramp("vertical")], "stable-domain", measurer, 240, 720)
      .legends[0];
    expect(horizontal?.type).toBe("ramp");
    expect(vertical?.type).toBe("ramp");
    if (horizontal?.type !== "ramp" || vertical?.type !== "ramp") return;
    expect(horizontal.stops[0]?.[1]).toBe("low");
    expect(horizontal.stops.at(-1)?.[1]).toBe("high");
    expect(vertical.stops[0]?.[1]).toBe("high");
    expect(vertical.stops.at(-1)?.[1]).toBe("low");
  });

  it("wraps legend labels without truncating semantic text", () => {
    const fullLabel = "A deliberately long category label that must wrap";
    const block = buildLegends(
      [
        discrete({
          domain: [fullLabel],
          firstSeen: [fullLabel],
          appearance: {
            type: "legend",
            title: "Groups",
            order: 0,
            position: "bottom",
            direction: "horizontal",
            collision: "wrap",
          },
        }),
      ],
      "stable-domain",
      measurer,
      90,
      170,
    );
    const legend = block.legends[0];
    expect(legend?.type).toBe("discrete");
    if (legend?.type !== "discrete") return;
    expect(legend.entries[0]?.lines?.length).toBeGreaterThan(1);
    expect(legend.entries[0]?.lines?.join(" ")).toBe(fullLabel);
    expect(legend.entries[0]?.label).not.toContain("…");
    expect(legend.entries[0]?.height).toBeGreaterThan(24);
  });

  it("spaces rows and reserves height using the configured key size", () => {
    const block = buildLegends(
      [
        discrete({
          appearance: {
            type: "legend",
            title: "Groups",
            order: 0,
            position: "right",
            direction: "vertical",
            keySize: 48,
          },
        }),
      ],
      "stable-domain",
      measurer,
      240,
      720,
    );
    const legend = block.legends[0];
    expect(legend?.type).toBe("discrete");
    if (legend?.type !== "discrete") return;
    expect(legend.entries[1]!.y - legend.entries[0]!.y).toBeGreaterThanOrEqual(48);
    expect(legend.entries.every((entry) => entry.height === 48)).toBe(true);
    expect(legend.height).toBeGreaterThanOrEqual(18 + 2 * 48 + 4);
  });

  it("keeps horizontal colorsteps ordered and inside their measured box", () => {
    const block = buildLegends([steps("horizontal", 64)], "stable-domain", measurer, 48, 128);
    const legend = block.legends[0];
    expect(legend?.type).toBe("steps");
    if (legend?.type !== "steps") return;
    expect(legend.entries[0]?.fullLabel).toBe("bin-0");
    expect(legend.entries.at(-1)?.fullLabel).toBe("bin-63");
    const last = legend.entries.at(-1)!;
    expect((last.x ?? 0) + legend.stepWidth + 8).toBeLessThanOrEqual(legend.width + 1e-6);
  });

  it("retains high-to-low vertical colorsteps order", () => {
    const legend = buildLegends([steps("vertical")], "stable-domain", measurer, 240, 720)
      .legends[0];
    expect(legend?.type).toBe("steps");
    if (legend?.type !== "steps") return;
    expect(legend.entries.map((entry) => entry.fullLabel)).toEqual(["bin-1", "bin-0"]);
  });

  it("includes a colorbar title in the reserved width", () => {
    const title = "A substantially wider colorbar title";
    const legend = buildLegends([ramp("vertical", title)], "stable-domain", measurer, 300, 720)
      .legends[0];
    expect(legend?.type).toBe("ramp");
    expect(legend?.width).toBeGreaterThanOrEqual(measurer.measureWidth(title, 11) + 8);
  });

  it("sizes the title band from the configured guide title font", () => {
    const input = discrete({
      appearance: {
        type: "legend",
        title: "Large title",
        order: 0,
        position: "right",
        direction: "vertical",
        theme: { titleSize: 32 },
      },
    });
    const legend = buildLegends([input], "stable-domain", measurer, 240, 720).legends[0];
    expect(legend?.type).toBe("discrete");
    if (legend?.type !== "discrete") return;
    expect(legend.titleHeight).toBeGreaterThanOrEqual(39);
    expect(legend.entries[0]?.y).toBeGreaterThanOrEqual(legend.titleHeight ?? 0);
  });

  it("uses the configured ramp length for vertical colorbars", () => {
    const input = ramp("vertical");
    input.appearance = {
      ...input.appearance!,
      theme: { colorbarLength: 180 },
    };
    const legend = buildLegends([input], "stable-domain", measurer, 240, 720).legends[0];
    expect(legend?.type).toBe("ramp");
    if (legend?.type !== "ramp") return;
    expect(legend.rampHeight).toBe(180);
    expect(legend.ticks.map((tick) => tick.y)).toEqual([180, 0]);
  });

  it("checks collision:error on every overflowing guide side", () => {
    const right = discrete({
      domain: ["a", "b", "c"],
      firstSeen: ["a", "b", "c"],
      appearance: {
        type: "legend",
        title: "Right",
        order: 0,
        position: "right",
        direction: "vertical",
      },
    });
    const bottom = discrete({
      scale: "fill",
      title: "Bottom",
      domain: ["d", "e", "f", "g"],
      firstSeen: ["d", "e", "f", "g"],
      appearance: {
        type: "legend",
        title: "Bottom",
        order: 1,
        position: "bottom",
        direction: "horizontal",
        collision: "error",
      },
    });
    expect(() => buildLegends([right, bottom], "stable-domain", measurer, 48, 128, 60)).toThrow(
      expect.objectContaining({ scale: "fill" }),
    );
  });

  it("insets horizontal ramps for endpoint label overhang", () => {
    const input = ramp("horizontal");
    input.format = (value) => (value === 0 ? "minimum" : "maximum");
    const legend = buildLegends([input], "stable-domain", measurer, 220, 240).legends[0];
    expect(legend?.type).toBe("ramp");
    if (legend?.type !== "ramp") return;
    const leftHalf = measurer.measureWidth(legend.ticks[0]!.label, legend.labelSize ?? 11) / 2;
    const rightHalf = measurer.measureWidth(legend.ticks.at(-1)!.label, legend.labelSize ?? 11) / 2;
    expect(legend.rampX).toBeGreaterThanOrEqual(leftHalf);
    expect((legend.rampX ?? 0) + legend.rampWidth + rightHalf).toBeLessThanOrEqual(legend.width);
  });
});
