/**
 * Facet strip position and visibility (issue #590).
 * Seam: runPipeline scene geometry + SVG strip chrome.
 */
import { describe, expect, it } from "bun:test";
import { aes, gg } from "@ggsvelte/spec";

import { runPipeline } from "../../src/pipeline.ts";
import { sceneToSVGString } from "../../src/render-svg.ts";
import { STRIP_BAND } from "../../src/scene.ts";
import { size, wrapRows } from "./fixtures.ts";

function facetSpec(strip?: { position?: "top" | "bottom" | "left" | "right"; show?: boolean }) {
  return gg(wrapRows, aes({ x: "x", y: "y" }))
    .geomPoint()
    .facet({
      wrap: { field: "g", levels: ["a", "b", "c"] },
      ...(strip !== undefined && { strip }),
    })
    .spec();
}

describe("facet strip position — layout and render (#590)", () => {
  it("defaults to top strips with a reserved band above every panel", () => {
    const model = runPipeline(facetSpec(), size);
    const panel = model.scene.panels[0]!;
    expect(panel.strip).toBe("a");
    expect(panel.stripPosition).toBe("top");
    expect(panel.showStrip).toBe(true);
    expect(panel.stripBand).toBe(STRIP_BAND);
    // Panel content starts below the strip band
    expect(panel.y).toBeGreaterThanOrEqual(STRIP_BAND);

    const svg = sceneToSVGString(model.scene);
    expect(svg).toContain('class="gg-strip"');
  });

  it("bottom strips place the band below the panel and axis margin", () => {
    const model = runPipeline(facetSpec({ position: "bottom" }), size);
    const panels = model.scene.panels;
    expect(panels.every((p) => p.stripPosition === "bottom")).toBe(true);
    expect(panels[0]!.stripBand).toBe(STRIP_BAND);

    const svg = sceneToSVGString(model.scene);
    // Scene panels and strip groups share paint order; axis-bearing panels
    // clear the tick band before the strip chrome starts.
    const strips = [...svg.matchAll(/class="gg-strip" transform="translate\(([^,]+),([^)]+)\)"/g)];
    expect(strips).toHaveLength(panels.length);
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i]!;
      const stripY = Number(strips[i]![2]);
      const axisBand = panel.axisX === null ? 0 : 28;
      expect(stripY).toBeCloseTo(panel.y + panel.height + axisBand, 1);
    }
  });

  it("left strips reserve horizontal space and draw outside the y-axis band", () => {
    const model = runPipeline(
      gg(wrapRows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .facet({
          wrap: {
            field: "g",
            levels: ["a", "b"],
            labels: { a: "Alpha Region", b: "Beta Zone" },
          },
          strip: { position: "left" },
        })
        .spec(),
      size,
    );
    const panel = model.scene.panels[0]!;
    expect(panel.stripPosition).toBe("left");
    expect(panel.stripBand).toBeGreaterThan(STRIP_BAND); // long label → wider band
    expect(panel.x).toBeGreaterThanOrEqual(panel.stripBand!);

    const svg = sceneToSVGString(model.scene);
    expect(svg).toContain("Alpha Region");
    const match = svg.match(/class="gg-strip" transform="translate\(([^,]+),([^)]+)\)"/);
    expect(match).not.toBeNull();
    const stripX = Number(match![1]);
    // Strip is left of the y-axis margin when the panel draws a left axis.
    const axisBand = panel.axisY === null ? 0 : 36;
    expect(stripX).toBeCloseTo(panel.x - axisBand - panel.stripBand!, 1);
  });

  it("right strips draw to the right of the panel content", () => {
    const model = runPipeline(facetSpec({ position: "right" }), size);
    const panel = model.scene.panels[0]!;
    expect(panel.stripPosition).toBe("right");
    expect(panel.stripBand).toBeGreaterThan(0);

    const svg = sceneToSVGString(model.scene);
    const match = svg.match(/class="gg-strip" transform="translate\(([^,]+),([^)]+)\)"/);
    expect(match).not.toBeNull();
    const stripX = Number(match![1]);
    expect(stripX).toBeCloseTo(panel.x + panel.width, 1);
  });

  it("show:false hides strip chrome and reserves no strip band", () => {
    const model = runPipeline(facetSpec({ show: false }), size);
    const panel = model.scene.panels[0]!;
    // Display label remains for a11y/interaction consumers
    expect(panel.strip).toBe("a");
    expect(panel.showStrip).toBe(false);
    expect(panel.stripBand).toBe(0);

    const svg = sceneToSVGString(model.scene);
    expect(svg).not.toContain('class="gg-strip"');
  });
});
