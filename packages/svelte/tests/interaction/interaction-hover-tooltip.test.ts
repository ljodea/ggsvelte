import { describe, expect, it, vi } from "vitest";

import type { RenderModel } from "@ggsvelte/core";
import GGPlot from "../../src/lib/GGPlot.svelte";
import { withGrammarAsSpec } from "../helpers/ggplot-input.js";
import { render } from "../helpers/render.js";
import { until } from "../helpers/until.js";
import { requireModel, rows, size } from "./interaction-harness.js";

describe("hover + tooltip (overlays, never a pipeline re-run)", () => {
  /**
   * Map plot-pixel coordinates onto the capture surface. Uses the live SVG
   * width/height so container-responsive and non-`size` plots hit correctly
   * under exact inspection (hardcoded 480×320 scaled misses after layout
   * chrome changes).
   */
  function pointerMoveAt(capture: Element, x: number, y: number): void {
    const rect = capture.getBoundingClientRect();
    const svg = capture.ownerDocument?.querySelector("svg.gg-plot");
    const plotW = Number(svg?.getAttribute("width")) || size.width;
    const plotH = Number(svg?.getAttribute("height")) || size.height;
    capture.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: rect.left + (x / plotW) * rect.width,
        clientY: rect.top + (y / plotH) * rect.height,
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
        {
          geom: "line",
          render: "svg",
          aes: { color: null },
          params: { linewidth: 0.5 },
        },
        { geom: "point", render: "canvas", params: { size: 5 } },
      ],
      inspect: true,
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
    pointerMoveAt(capture, -100, -100);
    await until(() => container.querySelector(".gg-tooltip") === null);
  });

  it("geom_col hover shows tooltip without sibling mute by default (#633)", async () => {
    let model: RenderModel | null = null;
    const colRows = [
      { category: "A", count: 7030 },
      { category: "B", count: 2100 },
      { category: "C", count: 1800 },
    ];
    const { container } = render(GGPlot, {
      data: colRows,
      aes: { x: "category", y: "count" },
      layers: [{ geom: "col" }],
      inspect: true,
      onrender: (m: RenderModel) => {
        model = m;
      },
      ...size,
    });
    const m = requireModel(model);
    let seed = m.candidates.candidate(0);
    for (let id = 0; id < m.candidates.size; id++) {
      const candidate = m.candidates.candidate(id);
      if (candidate?.kind === "rects") {
        seed = candidate;
        break;
      }
    }
    if (seed === null || seed.kind !== "rects") throw new Error("expected rect candidate");
    const capture = container.querySelector(".gg-capture")!;
    pointerMoveAt(capture, seed.x, seed.y);
    await until(() => container.querySelector(".gg-tooltip") !== null);
    // #386: still no point ring on rects
    expect(container.querySelector(".gg-hover-ring")).toBeNull();
    // #633: default is tooltip-only — no focus-mask de-emphasis flicker
    expect(container.querySelectorAll(".gg-rects rect[data-gg-focused]")).toHaveLength(0);
    for (const rect of container.querySelectorAll(".gg-rects rect")) {
      expect(rect.getAttribute("opacity")).toBeNull();
    }
  });

  it("geom_col hover mutes siblings when inspect.muteSiblings is true (#633)", async () => {
    let model: RenderModel | null = null;
    const colRows = [
      { category: "A", count: 7030 },
      { category: "B", count: 2100 },
      { category: "C", count: 1800 },
    ];
    const { container } = render(GGPlot, {
      data: colRows,
      aes: { x: "category", y: "count" },
      layers: [{ geom: "col" }],
      inspect: { muteSiblings: true },
      onrender: (m: RenderModel) => {
        model = m;
      },
      ...size,
    });
    const m = requireModel(model);
    let seed = m.candidates.candidate(0);
    for (let id = 0; id < m.candidates.size; id++) {
      const candidate = m.candidates.candidate(id);
      if (candidate?.kind === "rects") {
        seed = candidate;
        break;
      }
    }
    if (seed === null || seed.kind !== "rects") throw new Error("expected rect candidate");
    const capture = container.querySelector(".gg-capture")!;
    pointerMoveAt(capture, seed.x, seed.y);
    await until(() => container.querySelector(".gg-tooltip") !== null);
    expect(container.querySelector(".gg-hover-ring")).toBeNull();
    await until(
      () => container.querySelectorAll(".gg-rects rect[data-gg-focused='true']").length === 1,
    );
    const focused = container.querySelectorAll(".gg-rects rect[data-gg-focused='true']");
    const muted = container.querySelectorAll(".gg-rects rect[data-gg-focused='false']");
    expect(focused).toHaveLength(1);
    expect(muted).toHaveLength(2);
    expect(focused[0]?.getAttribute("opacity")).toBeNull();
    for (const rect of muted) {
      expect(Number(rect.getAttribute("opacity"))).toBeLessThan(1);
    }
  });

  it("stacked area hover shows no point ring — closed fills are region marks (#1270)", async () => {
    let model: RenderModel | null = null;
    const areaRows = [
      { x: 0, y: 3, g: "a" },
      { x: 1, y: 3, g: "a" },
      { x: 2, y: 3, g: "a" },
      { x: 0, y: 2, g: "b" },
      { x: 1, y: 2, g: "b" },
      { x: 2, y: 2, g: "b" },
    ];
    const { container } = render(GGPlot, {
      data: areaRows,
      aes: { x: "x", y: "y", fill: "g" },
      layers: [{ geom: "area" }],
      inspect: true,
      onrender: (m: RenderModel) => {
        model = m;
      },
      ...size,
    });
    const m = requireModel(model);
    let seed = null;
    for (let id = 0; id < m.candidates.size; id++) {
      const candidate = m.candidates.candidate(id);
      if (candidate?.kind === "paths") {
        seed = candidate;
        break;
      }
    }
    if (seed === null) throw new Error("expected a paths candidate");
    const capture = container.querySelector(".gg-capture")!;
    pointerMoveAt(capture, seed.x, seed.y);
    await until(() => container.querySelector(".gg-tooltip") !== null);
    expect(container.querySelector(".gg-hover-ring")).toBeNull();
  });

  it("line hover keeps the point ring — open strokes anchor at a vertex (#1270)", async () => {
    let model: RenderModel | null = null;
    const lineRows = [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 2 },
    ];
    const { container } = render(GGPlot, {
      data: lineRows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "line" }],
      inspect: true,
      onrender: (m: RenderModel) => {
        model = m;
      },
      ...size,
    });
    const m = requireModel(model);
    let seed = null;
    for (let id = 0; id < m.candidates.size; id++) {
      const candidate = m.candidates.candidate(id);
      if (candidate?.kind === "paths") {
        seed = candidate;
        break;
      }
    }
    if (seed === null) throw new Error("expected a paths candidate");
    const capture = container.querySelector(".gg-capture")!;
    pointerMoveAt(capture, seed.x, seed.y);
    await until(() => container.querySelector(".gg-tooltip") !== null);
    expect(container.querySelector(".gg-hover-ring")).not.toBeNull();
  });

  it("keyboard navigation on the single chart surface shows the tooltip", async () => {
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      inspect: true,
      ...size,
    });
    const surface = container.querySelector<HTMLElement>(".gg-capture[tabindex='0']")!;
    surface.focus();
    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await until(() => container.querySelector(".gg-tooltip") !== null);
    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await until(() => container.querySelector(".gg-tooltip") === null);
  });

  it("grouped x inspection emits one legend-ordered member per derived series", async () => {
    let model: RenderModel | null = null;
    const events: Array<{
      phase: string;
      mode?: string;
      members?: readonly unknown[];
      focus?: unknown;
    }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y", color: "cls" },
      layers: [{ geom: "line" }, { geom: "point" }],
      key: "x",
      inspect: { mode: "x" },
      oninspect: (event: {
        phase: string;
        mode?: string;
        members?: readonly unknown[];
        focus?: unknown;
      }) => events.push(event),
      onrender: (next: RenderModel) => (model = next),
      ...size,
    });
    const candidate = model!.candidates.candidate(2)!;
    pointerMoveAt(container.querySelector(".gg-capture")!, candidate.x, candidate.y);
    await until(() => events.some((event) => event.phase === "change"));
    const event = events.find((value) => value.phase === "change")!;
    expect(event.mode).toBe("x");
    expect(event.members!.length).toBeGreaterThan(0);
    expect(event.focus).toBeDefined();
  });

  it("keeps default transient snapshots bounded but materializes all members for callbacks", async () => {
    const data = Array.from({ length: 12 }, (_, index) => ({
      id: `row-${index}`,
      x: 1,
      y: index + 1,
      series: `series-${index}`,
    }));
    let defaultModel: RenderModel | null = null;
    const defaultPlot = render(GGPlot, {
      data,
      aes: { x: "x", y: "y", color: "series" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: { mode: "x" },
      onrender: (next: RenderModel) => (defaultModel = next),
      ...size,
    });
    const defaultSeed = defaultModel!.candidates.candidate(0)!;
    pointerMoveAt(
      defaultPlot.container.querySelector(".gg-capture")!,
      defaultSeed.x,
      defaultSeed.y,
    );
    await until(() => defaultPlot.container.querySelector(".gg-tooltip") !== null);
    expect(defaultPlot.container.querySelectorAll(".gg-tooltip dl")).toHaveLength(8);

    let callbackModel: RenderModel | null = null;
    const changes: Array<{ members: readonly unknown[] }> = [];
    const callbackPlot = render(GGPlot, {
      data,
      aes: { x: "x", y: "y", color: "series" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: { mode: "x" },
      oninspect: (event: { phase: string; members?: readonly unknown[] }) => {
        if (event.phase === "change" && event.members !== undefined)
          changes.push({ members: event.members });
      },
      onrender: (next: RenderModel) => (callbackModel = next),
      ...size,
    });
    const callbackSeed = callbackModel!.candidates.candidate(0)!;
    pointerMoveAt(
      callbackPlot.container.querySelector(".gg-capture")!,
      callbackSeed.x,
      callbackSeed.y,
    );
    await until(() => changes.length > 0);
    expect(changes[0].members).toHaveLength(12);
  });

  it("updates a pinned overlay on container resize without repeating its semantic callback", async () => {
    const data = [
      { id: "a", x: 1, y: 2 },
      { id: "b", x: 2, y: 3 },
    ];
    let model: RenderModel | null = null;
    const changes: Array<{ state?: string; source?: string }> = [];
    const { container } = render(GGPlot, {
      data,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: true,
      width: "container",
      height: 300,
      oninspect: (event: { phase: string; state?: string; source?: string }) => {
        if (event.phase === "change") changes.push(event);
      },
      onrender: (next: RenderModel) => (model = next),
    });
    container.style.width = "400px";
    await until(() => container.querySelector("svg.gg-plot")?.getAttribute("width") === "400");
    const seed = model!.candidates.candidate(0)!;
    const capture = container.querySelector(".gg-capture")!;
    pointerMoveAt(capture, seed.x, seed.y);
    await until(() => changes.length > 0);
    capture.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await until(() => changes.at(-1)?.state === "pinned");
    const callbackCount = changes.length;
    const priorModel = model;
    container.style.width = "600px";
    await until(
      () =>
        container.querySelector("svg.gg-plot")?.getAttribute("width") === "600" &&
        model !== priorModel,
    );
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
    expect(changes).toHaveLength(callbackCount);
  });

  it("clears transient inspection when a new layout model commits", async () => {
    let model: RenderModel | null = null;
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      inspect: true,
      width: "container",
      height: 300,
      onrender: (next: RenderModel) => (model = next),
    });
    container.style.width = "400px";
    await until(() => container.querySelector("svg.gg-plot")?.getAttribute("width") === "400");
    const seed = model!.candidates.candidate(0)!;
    pointerMoveAt(container.querySelector(".gg-capture")!, seed.x, seed.y);
    await until(() => container.querySelector(".gg-tooltip") !== null);
    const priorModel = model;
    container.style.width = "600px";
    await until(
      () =>
        container.querySelector("svg.gg-plot")?.getAttribute("width") === "600" &&
        model !== priorModel,
    );
    await until(() => container.querySelector(".gg-tooltip") === null);
  });

  it("keeps a transient tooltip open while the pointer moves into it", async () => {
    let model: RenderModel | null = null;
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      inspect: true,
      onrender: (next: RenderModel) => (model = next),
      ...size,
    });
    const candidate = model!.candidates.candidate(0)!;
    const capture = container.querySelector(".gg-capture")!;
    pointerMoveAt(capture, candidate.x, candidate.y);
    await until(() => container.querySelector(".gg-tooltip") !== null);
    const tooltip = container.querySelector(".gg-tooltip")!;
    capture.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    tooltip.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
    expect(container.querySelector(".gg-tooltip")).not.toBeNull();
  });

  // #1069 — ThemeTufte is gridless: flat tooltip chrome (no keyline invent, no
  // "Click to pin" affordance). Default themes keep the instructional footer.
  // Theme is children/spec-only after #704 — fold via withGrammarAsSpec.
  it("tufte tooltips stay silent; default themes keep the pin affordance (#1069)", async () => {
    let tufteModel: RenderModel | null = null;
    const tuftePlot = render(
      GGPlot,
      withGrammarAsSpec({
        data: rows,
        aes: { x: "x", y: "y" },
        layers: [{ geom: "point", params: { size: 5 } }],
        theme: "tufte",
        inspect: true,
        onrender: (m: RenderModel) => {
          tufteModel = m;
        },
        ...size,
      }),
    );
    expect(tufteModel!.scene.theme.tooltipBorder).toBe("transparent");
    const tufteCandidate = tufteModel!.candidates.candidate(0)!;
    pointerMoveAt(
      tuftePlot.container.querySelector(".gg-capture")!,
      tufteCandidate.x,
      tufteCandidate.y,
    );
    await until(() => tuftePlot.container.querySelector(".gg-tooltip") !== null);
    const tufteTooltip = tuftePlot.container.querySelector(".gg-tooltip")!;
    expect(tufteTooltip.querySelector(".gg-tooltip-hint")).toBeNull();
    expect(tufteTooltip.textContent).not.toContain("Click to pin");

    let defaultModel: RenderModel | null = null;
    const defaultPlot = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point", params: { size: 5 } }],
      inspect: true,
      onrender: (m: RenderModel) => {
        defaultModel = m;
      },
      ...size,
    });
    expect(defaultModel!.scene.theme.tooltipBorder).not.toBe("transparent");
    const defaultCandidate = defaultModel!.candidates.candidate(0)!;
    pointerMoveAt(
      defaultPlot.container.querySelector(".gg-capture")!,
      defaultCandidate.x,
      defaultCandidate.y,
    );
    await until(() => defaultPlot.container.querySelector(".gg-tooltip") !== null);
    const defaultTooltip = defaultPlot.container.querySelector(".gg-tooltip")!;
    expect(defaultTooltip.querySelector(".gg-tooltip-hint")).not.toBeNull();
    expect(defaultTooltip.textContent).toContain("Click to pin");
  });

  it("omits pin affordance when inspect.pin is false (#1069)", async () => {
    let model: RenderModel | null = null;
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point", params: { size: 5 } }],
      inspect: { pin: false },
      onrender: (m: RenderModel) => {
        model = m;
      },
      ...size,
    });
    const candidate = model!.candidates.candidate(0)!;
    pointerMoveAt(container.querySelector(".gg-capture")!, candidate.x, candidate.y);
    await until(() => container.querySelector(".gg-tooltip") !== null);
    const tooltip = container.querySelector(".gg-tooltip")!;
    expect(tooltip.querySelector(".gg-tooltip-hint")).toBeNull();
    expect(tooltip.textContent).not.toContain("Click to pin");
  });
});
