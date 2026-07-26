/**
 * Characterization for multi-legend placement orchestration and public label helpers.
 * Guards behavior that must survive a module split of legend construction vs placement.
 */
import { describe, expect, it } from "bun:test";

import { FONT_METRICS } from "../src/layout/font-metrics.ts";
import { MetricsTableMeasurer } from "../src/layout/measure.ts";
import {
  assertLegendBlockFitsPlacedArea,
  buildLegends,
  disambiguatedLabels,
  type DiscreteLegendInput,
  type LegendInput,
} from "../src/legend.ts";

const measurer = new MetricsTableMeasurer(FONT_METRICS);

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

describe("disambiguatedLabels", () => {
  it("leaves unique band keys alone", () => {
    expect(disambiguatedLabels(["a", "b", 1])).toEqual(["a", "b", "1"]);
  });

  it("suffixes colliding band keys with value kind", () => {
    expect(disambiguatedLabels(["1", 1])).toEqual(["1 (text)", "1 (number)"]);
  });
});

describe("buildLegends domain order", () => {
  it("orders present-first-seen by firstSeen within domain", () => {
    const input = discrete({
      domain: ["c", "a", "b"],
      firstSeen: ["b", "a", "c"],
    });
    const legend = buildLegends([input], "present-first-seen", measurer, 240, 720).legends[0];
    expect(legend?.type).toBe("discrete");
    if (legend?.type !== "discrete") return;
    expect(legend.entries.map((entry) => entry.value)).toEqual(["b", "a", "c"]);
  });

  it("sorts domain labels for sorted order", () => {
    const input = discrete({
      domain: ["c", "a", "b"],
      firstSeen: ["c", "a", "b"],
    });
    const legend = buildLegends([input], "sorted", measurer, 240, 720).legends[0];
    expect(legend?.type).toBe("discrete");
    if (legend?.type !== "discrete") return;
    expect(legend.entries.map((entry) => entry.label)).toEqual(["a", "b", "c"]);
  });
});

describe("buildLegends placement orchestration", () => {
  it("marks autoMovedBottom when a narrow viewport forces auto guides below", () => {
    const input = discrete({
      appearance: {
        type: "legend",
        title: "Groups",
        order: 0,
        position: "auto",
        direction: "auto",
      },
    });
    // AUTO_BOTTOM_MAX_WIDTH is 480; pass a narrow viewport so auto positions bottom.
    const block = buildLegends([input], "stable-domain", measurer, 80, 400);
    expect(block.autoMovedBottom).toBe(true);
    expect(block.legends[0]?.position).toBe("bottom");
  });

  it("keeps auto guides on the right when the viewport is wide enough", () => {
    const input = discrete({
      appearance: {
        type: "legend",
        title: "Groups",
        order: 0,
        position: "auto",
        direction: "auto",
      },
    });
    const block = buildLegends([input], "stable-domain", measurer, 120, 900);
    expect(block.autoMovedBottom).toBe(false);
    expect(block.legends[0]?.position).toBe("right");
  });

  it("stacks right-side legends with the configured blockGap", () => {
    const first = discrete({
      title: "First",
      domain: ["a"],
      firstSeen: ["a"],
      appearance: {
        type: "legend",
        title: "First",
        order: 0,
        position: "right",
        direction: "vertical",
        theme: { blockGap: 20 },
      },
    });
    const second = discrete({
      scale: "fill",
      title: "Second",
      domain: ["b"],
      firstSeen: ["b"],
      appearance: {
        type: "legend",
        title: "Second",
        order: 1,
        position: "right",
        direction: "vertical",
      },
    });
    const block = buildLegends([first, second], "stable-domain", measurer, 240, 720);
    expect(block.legends).toHaveLength(2);
    const [a, b] = block.legends;
    expect(a?.y).toBe(0);
    expect(b?.y).toBe((a?.height ?? 0) + 20);
    expect(block.height).toBe((b?.y ?? 0) + (b?.height ?? 0));
  });
});

describe("assertLegendBlockFitsPlacedArea", () => {
  it("throws when a collision:error guide overflows the viewport after placement", () => {
    const inputs: LegendInput[] = [
      discrete({
        domain: ["a", "b", "c", "d", "e", "f"],
        firstSeen: ["a", "b", "c", "d", "e", "f"],
        appearance: {
          type: "legend",
          title: "Groups",
          order: 0,
          position: "right",
          direction: "vertical",
          collision: "error",
        },
      }),
    ];
    const block = buildLegends(
      inputs,
      "stable-domain",
      measurer,
      240,
      720,
      Number.POSITIVE_INFINITY,
    );
    expect(() => {
      assertLegendBlockFitsPlacedArea({
        block,
        inputs,
        viewportHeight: 40,
        rightTop: 0,
        bottomInset: 0,
      });
    }).toThrow(expect.objectContaining({ scale: "color", name: "LegendLayoutError" }));
  });

  it("allows overflow when collision is not error", () => {
    const inputs: LegendInput[] = [
      discrete({
        domain: ["a", "b", "c", "d", "e", "f"],
        firstSeen: ["a", "b", "c", "d", "e", "f"],
        appearance: {
          type: "legend",
          title: "Groups",
          order: 0,
          position: "right",
          direction: "vertical",
        },
      }),
    ];
    const block = buildLegends(
      inputs,
      "stable-domain",
      measurer,
      240,
      720,
      Number.POSITIVE_INFINITY,
    );
    expect(() => {
      assertLegendBlockFitsPlacedArea({
        block,
        inputs,
        viewportHeight: 40,
        rightTop: 0,
        bottomInset: 0,
      });
    }).not.toThrow();
  });
});
