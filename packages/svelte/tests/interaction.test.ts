/**
 * M2 component tests: facet rendering, coord flip, canvas strata (pixel
 * readback), hover/tooltip across strata, brush selection, brush-to-zoom
 * color stability, a11y attributes, container resize through run ids, and
 * model disposal.
 */
import { describe, expect, it, vi } from "vitest";

import type { RenderModel } from "@ggsvelte/core";

import GGPlot from "../src/lib/GGPlot.svelte";
import { render } from "./helpers/render.js";

const rows = [
  { x: 1, y: 10, cls: "a" },
  { x: 2, y: 20, cls: "b" },
  { x: 3, y: 15, cls: "a" },
  { x: 4, y: 25, cls: "b" },
];

const size = { width: 480, height: 320 };

function until(predicate: () => boolean, timeout = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (performance.now() - started > timeout) {
        reject(new Error("until() timed out"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

describe("facets + flip through the component", () => {
  it("renders one clipped panel group per facet value with strips", () => {
    const data = rows.map((r, i) => ({ ...r, g: i < 2 ? "p1" : "p2" }));
    const { container } = render(GGPlot, {
      data,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      facet: { wrap: "g" },
      ...size,
    });
    expect(container.querySelectorAll(".gg-panel")).toHaveLength(2);
    expect(container.querySelectorAll("clipPath")).toHaveLength(2);
    const strips = [...container.querySelectorAll(".gg-strip text")].map((t) => t.textContent);
    expect(strips).toEqual(["p1", "p2"]);
    // Fixed scales: y axis on the left panel only.
    expect(container.querySelectorAll(".gg-axis-y")).toHaveLength(1);
    expect(container.querySelectorAll(".gg-axis-x")).toHaveLength(2);
  });

  it("coord flip renders horizontal bars", () => {
    const { container } = render(GGPlot, {
      data: [
        { cat: "one", v: 4 },
        { cat: "two", v: 8 },
      ],
      aes: { x: "cat", y: "v" },
      layers: [{ geom: "col" }],
      coord: "flip",
      ...size,
    });
    const rects = [...container.querySelectorAll(".gg-rects rect")];
    expect(rects).toHaveLength(2);
    for (const rect of rects) {
      const w = Number(rect.getAttribute("width"));
      const h = Number(rect.getAttribute("height"));
      expect(Number(rect.getAttribute("x"))).toBeCloseTo(0, 3);
      expect(w).toBeGreaterThan(h); // horizontal bars
    }
  });
});

describe("canvas strata (decision 0006 graduated)", () => {
  const canvasProps = {
    data: rows,
    aes: { x: "x", y: "y" },
    layers: [{ geom: "point" as const, render: "canvas" as const, params: { size: 6 } }],
    theme: "light" as const,
    ...size,
  };

  it("builds the strata sandwich and paints marks onto the canvas (readback)", async () => {
    const { container } = render(GGPlot, canvasProps);
    const root = container.querySelector<HTMLElement>(".gg-plot-root")!;
    const canvas = container.querySelector("canvas.gg-canvas");
    expect(canvas).not.toBeNull();
    // Sandwich: chrome-bottom svg BEFORE the canvas, chrome-top svg after.
    const kids = [...root.children].map((el) => el.getAttribute("class") ?? "");
    const canvasIdx = kids.findIndex((c) => c.includes("gg-canvas"));
    expect(kids.slice(0, canvasIdx).some((c) => c.includes("gg-svg-chrome-bottom"))).toBe(true);
    expect(kids.slice(canvasIdx + 1).some((c) => c.includes("gg-svg-chrome-top"))).toBe(true);
    // No SVG mark elements for the canvas layer.
    expect(container.querySelectorAll("circle")).toHaveLength(0);
    // Readiness waits for the canvas first paint.
    await until(() => root.dataset["ggReady"] === "true");
    // Pixel readback at a mark position (points batch panel-local coords).
    const el = canvas as HTMLCanvasElement;
    const ctx = el.getContext("2d", { willReadFrequently: true })!;
    const dpr = window.devicePixelRatio || 1;
    let painted = 0;
    const data = ctx.getImageData(0, 0, el.width, el.height).data;
    for (let i = 3; i < data.length; i += 4) painted += (data[i] ?? 0) > 0 ? 1 : 0;
    // Four points of radius 6 -> at least ~4 * pi * 36 device px painted.
    expect(painted).toBeGreaterThan(4 * 3 * 36 * dpr * dpr * 0.5);
  });

  it("no z-index anywhere; strata are pointer-inert", () => {
    const { container } = render(GGPlot, { ...canvasProps, tooltip: true });
    const root = container.querySelector<HTMLElement>(".gg-plot-root")!;
    for (const el of root.querySelectorAll(".gg-stratum, canvas")) {
      expect(getComputedStyle(el).zIndex).toBe("auto");
      expect(getComputedStyle(el).pointerEvents).toBe("none");
    }
    const capture = root.querySelector(".gg-capture")!;
    expect(getComputedStyle(capture).pointerEvents).toBe("auto");
    // Capture layer is the LAST child (topmost by document order).
    expect(root.lastElementChild!.getAttribute("class")).toContain("gg-capture");
  });

  it("canvas a11y block: role img + label + data table behind a toggle", async () => {
    const { container } = render(GGPlot, canvasProps);
    const block = container.querySelector(".gg-canvas-a11y")!;
    expect(block.getAttribute("role")).toBe("img");
    expect(block.getAttribute("aria-label")).toContain("canvas-rendered marks");
    const style = getComputedStyle(block);
    expect(style.display).not.toBe("none");
    expect(style.visibility).not.toBe("hidden");
    const toggle = container.querySelector<HTMLButtonElement>(".gg-a11y-toggle")!;
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    toggle.click();
    await until(() => container.querySelector(".gg-a11y-table") !== null);
    const table = container.querySelector(".gg-a11y-table")!;
    expect(table.querySelectorAll("tbody tr")).toHaveLength(4);
    expect([...table.querySelectorAll("th")].map((t) => t.textContent)).toEqual(["x", "y"]);
  });

  it('a11y "force-svg" keeps marks as focusable SVG despite the canvas hint', () => {
    const { container } = render(GGPlot, { ...canvasProps, a11y: "force-svg", tooltip: true });
    expect(container.querySelector("canvas")).toBeNull();
    const circles = container.querySelectorAll("circle[tabindex='0']");
    expect(circles).toHaveLength(4);
    expect(circles[0]?.getAttribute("aria-label")).toContain("x 1");
  });
});

describe("hover + tooltip (overlays, never a pipeline re-run)", () => {
  function pointerMoveAt(capture: Element, x: number, y: number): void {
    const rect = capture.getBoundingClientRect();
    capture.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: rect.left + x,
        clientY: rect.top + y,
        bubbles: true,
      }),
    );
  }

  it("hover resolves the correct row across strata; tooltip shows mapped values", async () => {
    let model: RenderModel | null = null;
    const onrender = vi.fn((m: RenderModel) => {
      model = m;
    });
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y", color: "cls" },
      // The SAME data drawn twice: svg line UNDER canvas points — the hit
      // index resolves canvas-painted marks through the capture layer, and
      // topmost-wins picks the point layer over the line beneath it.
      layers: [
        { geom: "line", render: "svg", aes: { color: null }, params: { linewidth: 0.5 } },
        { geom: "point", render: "canvas", params: { size: 5 } },
      ],
      tooltip: true,
      onrender,
      ...size,
    });
    const renderCount = onrender.mock.calls.length;
    const m: RenderModel = model!;
    const scene = m.scene;
    const panel = scene.panels[0];
    if (panel === undefined) throw new Error("expected a panel");
    const batch = scene.batches.find((b) => b.kind === "points");
    if (batch === undefined || batch.kind !== "points") throw new Error("unreachable");
    const capture = container.querySelector(".gg-capture")!;

    // Hover the third point (source row 2: x 3, y 15, cls a).
    const px = panel.x + (batch.positions[4] ?? 0);
    const py = panel.y + (batch.positions[5] ?? 0);
    pointerMoveAt(capture, px, py);
    await until(() => container.querySelector(".gg-tooltip") !== null);
    const tooltip = container.querySelector(".gg-tooltip")!;
    expect(tooltip.textContent).toContain("x");
    expect(tooltip.textContent).toContain("3");
    expect(tooltip.textContent).toContain("15");
    expect(tooltip.textContent).toContain("a");
    // Hover highlight overlay is present…
    expect(container.querySelector(".gg-hover-ring")).not.toBeNull();
    // …and the pipeline did NOT re-run for hover (overlay-only contract).
    expect(onrender.mock.calls.length).toBe(renderCount);
    expect(model).toBe(m);

    // Miss: move to empty corner -> tooltip clears.
    pointerMoveAt(capture, panel.x + 1, panel.y + 1);
    await until(() => container.querySelector(".gg-tooltip") === null);
  });

  it("keyboard focus on an SVG mark shows the tooltip (a11y pass)", async () => {
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      tooltip: true,
      ...size,
    });
    const circle = container.querySelector<SVGCircleElement>("circle[tabindex='0']")!;
    expect(circle.getAttribute("role")).toBe("img");
    circle.focus();
    await until(() => container.querySelector(".gg-tooltip") !== null);
    circle.blur();
    await until(() => container.querySelector(".gg-tooltip") === null);
  });
});

describe("brush + brush-to-zoom", () => {
  function drag(capture: Element, x0: number, y0: number, x1: number, y1: number): void {
    const rect = capture.getBoundingClientRect();
    const opts = (x: number, y: number) => ({
      clientX: rect.left + x,
      clientY: rect.top + y,
      bubbles: true,
      button: 0,
      pointerId: 1,
    });
    capture.dispatchEvent(new PointerEvent("pointerdown", opts(x0, y0)));
    capture.dispatchEvent(new PointerEvent("pointermove", opts((x0 + x1) / 2, (y0 + y1) / 2)));
    capture.dispatchEvent(new PointerEvent("pointerup", opts(x1, y1)));
  }

  it("brush selects row indices via the hit-index rect query", async () => {
    let model: RenderModel | null = null;
    const selections: (number[] | null)[] = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      brush: true,
      onbrush: (sel: { rows: number[] } | null) => selections.push(sel === null ? null : sel.rows),
      onrender: (m: RenderModel) => {
        model = m;
      },
      ...size,
    });
    const scene = model!.scene;
    const panel = scene.panels[0];
    if (panel === undefined) throw new Error("expected a panel");
    const batch = scene.batches[0];
    if (batch === undefined || batch.kind !== "points") throw new Error("unreachable");
    const capture = container.querySelector(".gg-capture")!;
    // Rect around the first two points only.
    const xs = [0, 1].map((j) => panel.x + (batch.positions[j * 2] ?? 0));
    const ys = [0, 1].map((j) => panel.y + (batch.positions[j * 2 + 1] ?? 0));
    drag(
      capture,
      Math.min(...xs) - 5,
      Math.min(...ys) - 5,
      Math.max(...xs) + 5,
      Math.max(...ys) + 5,
    );
    await until(() => selections.length > 0);
    expect(selections[0]).toHaveLength(2);
    expect(new Set(selections[0])).toEqual(new Set([0, 1]));
  });

  it("brush-to-zoom respecs explicit domains; colors NEVER shift; double-click resets", async () => {
    let model: RenderModel | null = null;
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y", color: "cls" },
      layers: [{ geom: "point" }],
      zoom: true,
      onrender: (m: RenderModel) => {
        model = m;
      },
      ...size,
    });
    const before = model!;
    const fillsByClass = () => {
      const fills = [...container.querySelectorAll("circle")].map(
        (c) => c.getAttribute("fill") ?? "",
      );
      return fills;
    };
    const initialFills = fillsByClass();
    expect(new Set(initialFills).size).toBe(2);

    const panel = before.scene.panels[0];
    const capture = container.querySelector(".gg-capture")!;
    // Zoom into the right half (x in ~[2.5, 4]) -> rows 0 (x=1) drops out.
    drag(
      capture,
      panel.x + panel.width * 0.55,
      panel.y,
      panel.x + panel.width,
      panel.y + panel.height,
    );
    await until(() => model !== before && model !== null);
    const after = model!;
    expect(after.runId).toBeGreaterThan(before.runId);
    // The x domain narrowed (explicit domain respec via scale inversion).
    const beforeX = (before.scales.x as { domain: [number, number] }).domain;
    const afterX = (after.scales.x as { domain: [number, number] }).domain;
    expect(afterX[0]).toBeGreaterThan(beforeX[0]);
    // Out-of-domain points fall outside the panel (clipped away)…
    const outside = [...container.querySelectorAll("circle")].filter(
      (c) => Number(c.getAttribute("cx")) < 0,
    );
    expect(outside.length).toBeGreaterThan(0);
    // …and EVERY series kept its exact color (prevScales flowed — THE
    // zoom-color-stability contract).
    expect(fillsByClass()).toEqual(initialFills);

    // Double-click resets the zoom.
    capture.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await until(() =>
      [...container.querySelectorAll("circle")].every((c) => Number(c.getAttribute("cx")) >= 0),
    );
    expect(fillsByClass()).toEqual(initialFills);
  });
});

describe("container width + run ids + disposal", () => {
  it("width='container' follows the host element via ResizeObserver (debounced)", async () => {
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      width: "container",
      height: 300,
    });
    // The testing-library container is a plain block div: sizing it sizes
    // the plot root (width: 100% in container mode).
    container.style.width = "400px";
    await until(() => container.querySelector("svg.gg-plot")?.getAttribute("width") === "400");
    // Resize storm: several width changes back to back; the final width
    // wins (rAF debounce + monotonic run-id commits).
    for (const w of [380, 360, 340, 320]) container.style.width = `${w}px`;
    await until(() => container.querySelector("svg.gg-plot")?.getAttribute("width") === "320");
  });

  it("the previous model is disposed on commit (memory follow-through)", async () => {
    let model: RenderModel | null = null;
    const { rerender } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      ...size,
    });
    // rerender path exists; grab models through onrender on a second mount
    const models: RenderModel[] = [];
    const second = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      onrender: (m: RenderModel) => models.push(m),
      ...size,
    });
    await second.rerender({ data: rows.slice(0, 2) } as never);
    await until(() => models.length >= 2);
    const [first, latest] = [models[0], models.at(-1)];
    expect(latest).not.toBe(first);
    // Old model disposed: geometry released, row() inert.
    expect(first.scene.batches).toHaveLength(0);
    expect(first.row(0)).toBeNull();
    // Current model intact.
    expect(latest!.scene.batches.length).toBeGreaterThan(0);
    void model;
    void rerender;
  });
});
