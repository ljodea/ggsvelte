/**
 * M2 facets + coord flip + render backends — pipeline unit tests.
 * (R parity lives in facets-parity.test.ts; these cover the layout grid,
 * scale-freedom contract, global color assignment, backend resolution,
 * panel clipping in the SVG renderer, and the memory/dispose contract.)
 */
import { describe, expect, it } from "bun:test";

import { gg, aes } from "@ggsvelte/spec";

import { PipelineError, runPipeline } from "../src/pipeline.ts";
import { renderToSVGString, sceneToSVGString } from "../src/render-svg.ts";
import type { PointsBatch, RectsBatch } from "../src/scene.ts";
import { STRIP_BAND } from "../src/scene.ts";

const size = { width: 640, height: 400 };

const wrapRows = [
  { x: 1, y: 10, g: "b", cls: "u" },
  { x: 2, y: 20, g: "b", cls: "v" },
  { x: 1, y: 30, g: "a", cls: "u" },
  { x: 2, y: 40, g: "a", cls: "v" },
  { x: 1, y: 500, g: "c", cls: "u" },
  { x: 2, y: 900, g: "c", cls: "v" },
];

function wrapSpec(scales?: "fixed" | "free" | "free_x" | "free_y") {
  return gg(wrapRows, aes({ x: "x", y: "y", color: "cls" }))
    .geomPoint()
    .facet({ wrap: "g", ...(scales !== undefined && { scales }) })
    .spec();
}

describe("facet wrap — panel grid", () => {
  it("one panel per distinct value, sorted ascending, near-square wrap", () => {
    const model = runPipeline(wrapSpec(), size);
    const panels = model.scene.panels;
    expect(panels).toHaveLength(3);
    expect(panels.map((p) => p.strip)).toEqual(["a", "b", "c"]);
    // 3 panels, default ncol = ceil(sqrt(3)) = 2 -> 2 columns, 2 rows.
    expect(panels[0]!.y).toBe(panels[1]!.y);
    expect(panels[2]!.y).toBeGreaterThan(panels[0]!.y);
    // Row-major placement: panel 0 left of panel 1.
    expect(panels[0]!.x).toBeLessThan(panels[1]!.x);
    // Strips reserve a band above every panel.
    expect(panels[0]!.y).toBeGreaterThanOrEqual(STRIP_BAND);
  });

  it("respects explicit ncol", () => {
    const model = runPipeline(
      gg(wrapRows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .facet({ wrap: "g", ncol: 3 })
        .spec(),
      size,
    );
    const panels = model.scene.panels;
    expect(panels).toHaveLength(3);
    expect(new Set(panels.map((p) => p.y)).size).toBe(1); // one row
  });

  it("each panel gets only its own rows (partition BEFORE geometry)", () => {
    const model = runPipeline(wrapSpec(), size);
    const points = model.scene.batches.filter((b): b is PointsBatch => b.kind === "points");
    expect(points).toHaveLength(3); // one batch per panel
    for (const batch of points) expect(batch.rowIndex.length).toBe(2);
    // rowIndex still refers to SOURCE rows: panel "a" (sorted first) owns
    // source rows 2 and 3.
    const panelA = points.find((b) => b.panelIndex === 0)!;
    expect([...panelA.rowIndex].toSorted((a, b) => a - b)).toEqual([2, 3]);
  });

  it("fixed scales: axes only on the grid edges; ticks identical across panels", () => {
    const model = runPipeline(wrapSpec("fixed"), size);
    const panels = model.scene.panels;
    // 2x2 wrap of 3 panels: left column = panels 0 and 2 draw the y axis.
    expect(panels[0]!.axisY).not.toBeNull();
    expect(panels[1]!.axisY).toBeNull();
    expect(panels[2]!.axisY).not.toBeNull();
    // Bottom-most panel of each column draws x: col 0 -> panel 2; col 1 ->
    // panel 1 (last row is partial).
    expect(panels[2]!.axisX).not.toBeNull();
    expect(panels[1]!.axisX).not.toBeNull();
    expect(panels[0]!.axisX).toBeNull();
    // Grid lines exist on EVERY panel and coincide (shared scales).
    expect(panels[1]!.grid.y).toEqual(panels[0]!.grid.y);
  });

  it("free_y: per-panel y domains, per-panel left axes", () => {
    const model = runPipeline(wrapSpec("free_y"), size);
    const panels = model.scene.panels;
    // Every panel draws its own y axis now.
    for (const p of panels) expect(p.axisY).not.toBeNull();
    // Panel "c" (y up to 900) has a different domain than panel "a".
    const domains = model.scales.panels.map((s) => (s.y as { domain: [number, number] }).domain);
    expect(domains[0]![1]).toBeLessThan(100);
    expect(domains[2]![1]).toBeGreaterThanOrEqual(900);
    // x stays shared.
    const xDomains = model.scales.panels.map((s) => (s.x as { domain: [number, number] }).domain);
    expect(xDomains[0]).toEqual(xDomains[2]);
  });

  it("fixed scales train on the union of panel domains", () => {
    const model = runPipeline(wrapSpec("fixed"), size);
    const yDomain = (model.scales.y as { domain: [number, number] }).domain;
    expect(yDomain[1]).toBeGreaterThanOrEqual(900); // panel c's extreme
  });

  it("discrete color assignments are ALWAYS global — one legend, stable colors across panels", () => {
    const model = runPipeline(wrapSpec("free"), size);
    expect(model.scene.legends).toHaveLength(1);
    const points = model.scene.batches.filter((b): b is PointsBatch => b.kind === "points");
    // Row order within each panel is u, v — colors match across panels.
    const colorPairs = points.map((b) => b.colors!.join("|"));
    expect(new Set(colorPairs).size).toBe(1);
  });

  it("facet grid: rows x cols combinations, combined strip labels, empty combos kept", () => {
    const rows = [
      { x: 1, y: 1, r: "r1", c: "c1" },
      { x: 2, y: 2, r: "r1", c: "c2" },
      { x: 3, y: 3, r: "r2", c: "c1" },
      // r2/c2 never occurs -> empty panel
    ];
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .facet({ rows: "r", cols: "c" })
        .spec(),
      size,
    );
    const panels = model.scene.panels;
    expect(panels).toHaveLength(4);
    expect(panels.map((p) => p.strip)).toEqual(["r1 / c1", "r1 / c2", "r2 / c1", "r2 / c2"]);
    const points = model.scene.batches.filter((b): b is PointsBatch => b.kind === "points");
    expect(points.map((b) => b.panelIndex).toSorted((a, b) => a - b)).toEqual([0, 1, 2]);
  });

  it("null facet values form their own panel, sorted last", () => {
    const rows = [
      { x: 1, y: 1, g: null },
      { x: 2, y: 2, g: "a" },
    ];
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .facet({ wrap: "g" })
        .spec(),
      size,
    );
    expect(model.scene.panels.map((p) => p.strip)).toEqual(["a", "(null)"]);
  });

  it("unknown facet field is a structured error with did-you-mean", () => {
    expect(() =>
      runPipeline(
        gg(wrapRows, aes({ x: "x", y: "y" }))
          .geomPoint()
          .facet({ wrap: "gg" })
          .spec(),
        size,
      ),
    ).toThrow(PipelineError);
    try {
      runPipeline(
        gg(wrapRows, aes({ x: "x", y: "y" }))
          .geomPoint()
          .facet({ wrap: "gg" })
          .spec(),
        size,
      );
    } catch (error) {
      const e = error as PipelineError;
      expect(e.code).toBe("unknown-field");
      expect(e.path).toBe("/facet/wrap");
      expect(e.message).toContain('Did you mean "g"?');
    }
  });

  it("per-panel stats: stacked bars stack within their panel only", () => {
    const rows = [
      { cat: "a", kind: "u", g: "p1" },
      { cat: "a", kind: "v", g: "p1" },
      { cat: "a", kind: "u", g: "p2" },
    ];
    const model = runPipeline(
      gg(rows, aes({ x: "cat", fill: "kind" }))
        .geomBar()
        .facet({ wrap: "g" })
        .spec(),
      size,
    );
    const rects = model.scene.batches.filter((b): b is RectsBatch => b.kind === "rects");
    const p1 = rects.find((b) => b.panelIndex === 0)!;
    const p2 = rects.find((b) => b.panelIndex === 1)!;
    expect(p1.rects.length / 4).toBe(2); // two stacked segments
    expect(p2.rects.length / 4).toBe(1); // one segment: only u present
  });
});

describe("coord flip — geometry", () => {
  const barRows = [
    { cat: "one", v: 4 },
    { cat: "two", v: 8 },
    { cat: "three", v: 2 },
  ];

  it("horizontal bars: anchored at x = 0, first band at the bottom", () => {
    const model = runPipeline(
      gg(barRows, aes({ x: "cat", y: "v" }))
        .geomCol()
        .coordFlip()
        .spec(),
      size,
    );
    const panel = model.scene.panels[0]!;
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.kind).toBe("rects");
    const bars = Array.from({ length: batch.rects.length / 4 }, (_, j) => ({
      x: batch.rects[j * 4]!,
      y: batch.rects[j * 4 + 1]!,
      w: batch.rects[j * 4 + 2]!,
      h: batch.rects[j * 4 + 3]!,
    }));
    // All bars share the same baseline left edge (semantic 0, offset by the 5%
    // measure-axis expansion — no longer pixel 0).
    const baseX = bars[0]!.x;
    for (const bar of bars) expect(bar.x).toBeCloseTo(baseX, 3);
    // Bar lengths ordered like the data values 4, 8, 2.
    expect(bars[1]!.w).toBeGreaterThan(bars[0]!.w);
    expect(bars[2]!.w).toBeLessThan(bars[0]!.w);
    // First category ("one") sits at the BOTTOM (largest y).
    expect(bars[0]!.y).toBeGreaterThan(bars[1]!.y);
    expect(bars[1]!.y).toBeGreaterThan(bars[2]!.y);
    // Bands slice the panel VERTICALLY now.
    for (const bar of bars) expect(bar.h).toBeCloseTo((panel.height / 3) * 0.9, 0);
  });

  it("flip swaps stacking onto the horizontal axis (position stack)", () => {
    const rows = [
      { cat: "a", kind: "u", v: 3 },
      { cat: "a", kind: "w", v: 5 },
    ];
    const model = runPipeline(
      gg(rows, aes({ x: "cat", y: "v", fill: "kind" }))
        .geomCol()
        // flush measure axis so the stack starts exactly at pixel 0
        .scales({ y: { expand: { mult: 0, add: 0 } } })
        .coordFlip()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as RectsBatch;
    const segs = Array.from({ length: 2 }, (_, j) => ({
      x: batch.rects[j * 4]!,
      w: batch.rects[j * 4 + 2]!,
    })).toSorted((a, b) => a.x - b.x);
    // Two segments tile the horizontal extent contiguously from 0:
    // [0, t(3)] then [t(3), t(8)] (first-seen group stacks on top).
    expect(segs[0]!.x).toBeCloseTo(0, 2);
    expect(segs[1]!.x).toBeCloseTo(segs[0]!.x + segs[0]!.w, 2);
    expect(segs[1]!.w).toBeGreaterThan(0);
  });

  it("flip swaps the axes: left = categories, bottom = measure; titles follow", () => {
    const model = runPipeline(
      gg(barRows, aes({ x: "cat", y: "v" }))
        .geomCol()
        .coordFlip()
        .spec(),
      size,
    );
    expect(model.scene.axes.x.title).toBe("v"); // bottom shows the measure
    expect(model.scene.axes.y.title).toBe("cat");
    const left = model.scene.panels[0]!.axisY ?? [];
    expect(new Set(left.map((t) => t.label))).toEqual(new Set(["one", "two", "three"]));
  });

  it("flip composes with facets", () => {
    const rows = wrapRows.map((r) => ({ ...r, cat: r.x === 1 ? "l" : "r" }));
    const model = runPipeline(
      gg(rows, aes({ x: "cat", y: "y" }))
        .geomCol()
        .facet({ wrap: "g" })
        // flush measure axis so bars anchor exactly at pixel 0 across panels
        .scales({ y: { expand: { mult: 0, add: 0 } } })
        .coordFlip()
        .spec(),
      size,
    );
    expect(model.scene.panels).toHaveLength(3);
    const rects = model.scene.batches.filter((b): b is RectsBatch => b.kind === "rects");
    for (const batch of rects) {
      for (let j = 0; j < batch.rects.length / 4; j++) {
        expect(batch.rects[j * 4]!).toBeCloseTo(0, 3); // horizontal bars everywhere
      }
    }
  });

  it("annotation rules flip too: a yintercept renders as a vertical line", () => {
    const model = runPipeline(
      gg(barRows, aes({ x: "cat", y: "v" }))
        .geomCol()
        .geomRule({ yintercept: 5 })
        .coordFlip()
        .spec(),
      size,
    );
    const segs = model.scene.batches.find((b) => b.kind === "segments")!;
    if (segs.kind !== "segments") throw new Error("unreachable");
    // The y-channel intercept renders on the bottom (horizontal) axis, so
    // the rule line is VERTICAL: x1 === x2, spanning the panel height.
    expect(segs.segments[0]!).toBeCloseTo(segs.segments[2]!, 3);
    expect(Math.abs(segs.segments[3]! - segs.segments[1]!)).toBeCloseTo(
      model.scene.panels[0]!.height,
      3,
    );
  });
});

describe("render backends (auto threshold, hints, a11y)", () => {
  const manyRows = Array.from({ length: 30 }, (_, i) => ({ x: i, y: i * 2 }));

  it("auto resolves to svg below the threshold, canvas above (advisory)", () => {
    const below = runPipeline(
      gg(manyRows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      size,
    );
    expect(below.layerBackends).toEqual(["svg"]);
    expect(below.advisories.some((a) => a.code === "canvas-auto")).toBe(false);

    const above = runPipeline(
      gg(manyRows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      {
        ...size,
        canvasThreshold: 10,
      },
    );
    expect(above.layerBackends).toEqual(["canvas"]);
    const advisory = above.advisories.find((a) => a.code === "canvas-auto");
    expect(advisory).toBeDefined();
    expect(advisory!.path).toBe("layers.0");
    expect(advisory!.howToOverride).toContain("render");
  });

  it("explicit render hints win without advisories", () => {
    const model = runPipeline(
      gg(manyRows, aes({ x: "x", y: "y" }))
        .geomPoint({ render: "canvas" })
        .geomLine({ render: "svg" })
        .spec(),
      { ...size, canvasThreshold: 1 },
    );
    expect(model.layerBackends).toEqual(["canvas", "svg"]);
    expect(model.advisories.some((a) => a.code === "canvas-auto")).toBe(false);
  });

  it('a11y: "force-svg" overrides hints and thresholds', () => {
    const model = runPipeline(
      gg(manyRows, aes({ x: "x", y: "y" }))
        .geomPoint({ render: "canvas" })
        .a11y("force-svg")
        .spec(),
      { ...size, canvasThreshold: 1 },
    );
    expect(model.layerBackends).toEqual(["svg"]);
  });

  it("renderToSVGString is unaffected by render hints (always all-SVG)", () => {
    const svg = renderToSVGString(
      gg(manyRows, aes({ x: "x", y: "y" })).geomPoint({ render: "canvas" }),
      { width: 640 },
    );
    expect(svg).toContain("<circle");
  });
});

describe("SVG renderer — panels, clipping, strips", () => {
  it("marks clip to their panel rect (clipPath per panel)", () => {
    const model = runPipeline(wrapSpec(), size);
    const svg = sceneToSVGString(model.scene);
    expect(svg).toContain('clip-path="url(#gg-clip-0)"');
    expect(svg).toContain('clip-path="url(#gg-clip-2)"');
    expect((svg.match(/<clipPath/g) ?? []).length).toBe(3);
    expect(svg).toContain('class="gg-strip"');
    expect(svg).toContain(">a</text>");
  });

  it("single-panel plots clip too (jitter/ribbons under pinned domains)", () => {
    const model = runPipeline(
      gg(wrapRows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      size,
    );
    const svg = sceneToSVGString(model.scene);
    expect((svg.match(/<clipPath/g) ?? []).length).toBe(1);
    expect(svg).not.toContain("gg-strip");
  });
});

describe("RenderModel memory + tooltip contract", () => {
  it("row() reads source rows; layerFields lists mapped channels", () => {
    const model = runPipeline(wrapSpec(), size);
    expect(model.row(2)).toEqual({ x: 1, y: 30, g: "a", cls: "u" });
    expect(model.row(0xffffffff)).toBeNull();
    expect(model.layerFields[0]).toEqual([
      { channel: "x", field: "x" },
      { channel: "y", field: "y" },
      { channel: "color", field: "cls" },
    ]);
  });

  it("dispose() releases geometry and row access", () => {
    const model = runPipeline(wrapSpec(), size);
    expect(model.scene.batches.length).toBeGreaterThan(0);
    expect(model.candidates.candidate(0)).not.toBeNull();
    model.dispose();
    expect(model.scene.batches).toHaveLength(0);
    expect(model.candidates.size).toBe(0);
    expect(model.candidates.candidate(0)).toBeNull();
    expect(model.candidates.x).toHaveLength(0);
    expect(model.row(0)).toBeNull();
    model.dispose(); // idempotent
  });
});
