import { describe, expect, it } from "vitest";

import type { BatchInteractionMask, GeometryBatch, ThemeTokens } from "@ggsvelte/core";

import BatchFocusHarness from "../fixtures/BatchFocusHarness.svelte";
import { render } from "../helpers/render.js";

const theme = {
  ink: "#111111",
  accent: "#3366ff",
  paper: "#ffffff",
  interactionMuted: 0.25,
  fontFamily: "sans-serif",
} as ThemeTokens;

const focusFirst: BatchInteractionMask = {
  primitiveCount: 2,
  focusedCount: 1,
  isFocused: (index) => index === 0,
};

function renderBatch(batch: GeometryBatch): SVGElement[] {
  const { container } = render(BatchFocusHarness, { batch, theme, focusMask: focusFirst });
  return [...container.querySelectorAll<SVGElement>(".gg-batch > *")];
}

describe("SVG batch focus masks", () => {
  it("reorders and mutes rect primitives", () => {
    const elements = renderBatch({
      kind: "rects",
      layerIndex: 0,
      panelIndex: 0,
      rects: Float32Array.from([1, 2, 3, 4, 11, 12, 13, 14]),
      rowIndex: Uint32Array.from([0, 1]),
      fill: "#3366ff",
      alpha: 1,
    });

    expect(elements.map((element) => element.getAttribute("x"))).toEqual(["11", "1"]);
    expect(elements.map((element) => element.dataset["ggFocused"])).toEqual(["false", "true"]);
    expect(elements[0].getAttribute("opacity")).toBe("0.25");
    expect(elements[1].getAttribute("opacity")).toBeNull();
  });

  it("reorders and mutes segment primitives", () => {
    const elements = renderBatch({
      kind: "segments",
      layerIndex: 0,
      panelIndex: 0,
      segments: Float32Array.from([1, 2, 3, 4, 11, 12, 13, 14]),
      rowIndex: Uint32Array.from([0, 1]),
      stroke: "#111111",
      linewidth: 1,
      alpha: 1,
    });

    expect(elements.map((element) => element.getAttribute("x1"))).toEqual(["11", "1"]);
    expect(elements.map((element) => element.dataset["ggFocused"])).toEqual(["false", "true"]);
    expect(elements[0].getAttribute("opacity")).toBe("0.25");
  });

  it("reorders and mutes glyph primitives", () => {
    const elements = renderBatch({
      kind: "glyphs",
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from([1, 2, 11, 12]),
      rowIndex: Uint32Array.from([0, 1]),
      texts: ["focused", "muted"],
      color: "#111111",
      size: 11,
      anchor: "middle",
      alpha: 1,
    });

    expect(elements.map((element) => element.textContent)).toEqual(["muted", "focused"]);
    expect(elements.map((element) => element.dataset["ggFocused"])).toEqual(["false", "true"]);
    expect(elements[0].getAttribute("opacity")).toBe("0.25");
  });
});
