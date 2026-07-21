/**
 * M2 component tests: facet rendering, coord flip, canvas strata (pixel
 * readback), hover/tooltip across strata, brush selection, brush-to-zoom
 * color stability, a11y attributes, container resize through run ids, and
 * model disposal.
 */
import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it, vi } from "vitest";

import type { RenderModel } from "@ggsvelte/core";
import { encodeKey } from "@ggsvelte/core";

import GGPlot from "../../src/lib/GGPlot.svelte";
import { createPlotInteraction } from "../../src/lib/interaction/controller.svelte.js";
import { render } from "../helpers/render.js";
import { until } from "../helpers/until.js";

const rows = [
  { x: 1, y: 10, cls: "a" },
  { x: 2, y: 20, cls: "b" },
  { x: 3, y: 15, cls: "a" },
  { x: 4, y: 25, cls: "b" },
];

const size = { width: 480, height: 320 };

function requireModel(model: RenderModel | null): RenderModel {
  if (model === null) throw new Error("expected render model");
  return model;
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
      // Continuous axes now reserve the documented 5% display expansion,
      // so the semantic-zero baseline is inset rather than flush to x=0.
      expect(Number(rect.getAttribute("x"))).toBeGreaterThanOrEqual(0);
      expect(w).toBeGreaterThan(h); // horizontal bars
    }
  });

  it("projects controller cross-panel domains and preserves typed band identity", async () => {
    let model: RenderModel | null = null;
    const interaction = createPlotInteraction<string>();
    const interactionScope = {
      keys: "typed-category-id",
      intervals: "typed-category-facets",
    } as const;
    const { container } = render(GGPlot, {
      data: [
        { id: "number-north", facet: "north", category: 1, y: 1 },
        { id: "string-north", facet: "north", category: "1", y: 2 },
        { id: "number-south", facet: "south", category: 1, y: 3 },
        { id: "string-south", facet: "south", category: "1", y: 4 },
      ],
      aes: { x: "category", y: "y" },
      layers: [{ geom: "point" }],
      facet: { wrap: "facet" },
      key: "id",
      select: { type: "interval", preset: "cross-panel" },
      interaction,
      interactionScope,
      onrender: (next: RenderModel) => {
        model = next;
      },
      ...size,
    });
    await until(() => model !== null);
    const originPanel = requireModel(model).scene.panels[0];
    if (originPanel === undefined) throw new Error("expected origin panel");
    const origin = originPanel.id;

    interaction.setInterval(
      {
        panelId: origin,
        preset: "cross-panel",
        domains: { x: { kind: "band", values: [encodeKey(1)] } },
        keys: ["stale-origin-key"],
      },
      { scope: interactionScope },
    );
    await until(() => container.querySelectorAll(".gg-selected-ring").length === 2);

    expect(container.querySelectorAll(".gg-selected-ring")).toHaveLength(2);
  });

  it("names the passive shared interval targeted by panel recovery controls", async () => {
    let model: RenderModel | null = null;
    const interaction = createPlotInteraction<string>();
    const interactionScope = {
      keys: "shared-row",
      intervals: "shared-facets",
    } as const;
    const { container } = render(GGPlot, {
      data: [
        { id: "north", facet: "North", x: 1, y: 1 },
        { id: "south", facet: "South", x: 2, y: 2 },
      ],
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      facet: { wrap: "facet" },
      key: "id",
      select: { type: "interval", mode: "x", preset: "union" },
      interaction,
      interactionScope,
      onrender: (next: RenderModel) => (model = next),
      ...size,
    });
    await until(() => model?.scene.panels.length === 2);
    const renderedModel = requireModel(model);
    for (const panel of renderedModel.scene.panels) {
      interaction.setInterval(
        {
          panelId: panel.id,
          preset: "union",
          domains: { x: { kind: "linear", domain: [0, 3] } },
          keys: [panel.strip.toLowerCase()],
        },
        { scope: interactionScope },
      );
    }
    const targetRecord = interaction.intervals(interactionScope)[0];
    if (targetRecord === undefined) throw new Error("expected interval record");
    const targetPanel = renderedModel.scene.panels.find(
      (panel) => panel.id === targetRecord.panelId,
    );
    if (targetPanel === undefined) throw new Error("expected target panel");
    const targetLabel = targetPanel.strip;
    await until(() =>
      [...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button")].some(
        (button) => button.textContent?.trim() === `Clear panel selection: ${targetLabel}`,
      ),
    );

    const edit = [...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button")].find(
      (button) => button.textContent?.trim() === `Edit x selection bounds: ${targetLabel}`,
    );
    expect(edit).not.toBeUndefined();
    const clear = [...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button")].find(
      (button) => button.textContent?.trim() === `Clear panel selection: ${targetLabel}`,
    )!;
    clear.click();
    await until(() => interaction.intervals(interactionScope).length === 1);
    expect(interaction.intervals(interactionScope)[0]?.panelId).not.toBe(targetRecord.panelId);
  });

  it("disambiguates typed facet values with identical strip text", async () => {
    let model: RenderModel | null = null;
    const interaction = createPlotInteraction<string>();
    const interactionScope = {
      keys: "typed-facet-row",
      intervals: "typed-facet-controls",
    } as const;
    const { container } = render(GGPlot, {
      data: [
        { id: "number", facet: 1, x: 1, y: 1 },
        { id: "text", facet: "1", x: 2, y: 2 },
      ],
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      facet: { wrap: "facet" },
      key: "id",
      select: { type: "interval", mode: "x", preset: "union" },
      interaction,
      interactionScope,
      onrender: (next: RenderModel) => {
        model = next;
      },
      ...size,
    });
    await until(() => model?.scene.panels.length === 2);
    const renderedModel = requireModel(model);
    for (const panel of renderedModel.scene.panels) {
      interaction.setInterval(
        {
          panelId: panel.id,
          preset: "union",
          domains: { x: { kind: "linear", domain: [0, 3] } },
          keys: [panel.id],
        },
        { scope: interactionScope },
      );
    }
    const clearButton = () =>
      [...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button")].find((button) =>
        button.textContent?.trim().startsWith("Clear panel selection:"),
      );
    await until(() => clearButton() !== undefined);
    const firstLabel = clearButton()?.textContent?.trim();
    clearButton()?.click();
    await until(
      () =>
        interaction.intervals(interactionScope).length === 1 &&
        clearButton()?.textContent?.trim() !== firstLabel,
    );
    const labels = [firstLabel, clearButton()?.textContent?.trim()];
    expect(labels).toContain("Clear panel selection: 1 (facet: number 1)");
    expect(labels).toContain("Clear panel selection: 1 (facet: text 1)");
  });

  it("restores focus and announces when an edited facet disappears", async () => {
    let model: RenderModel | null = null;
    const interaction = createPlotInteraction<string>();
    const interactionScope = { keys: "row", intervals: "facets" } as const;
    const base = {
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" as const }],
      facet: { wrap: "facet" },
      key: "id",
      select: { type: "interval" as const, mode: "x" as const },
      interaction,
      interactionScope,
      onrender: (next: RenderModel) => (model = next),
      ...size,
    };
    const view = render(GGPlot, {
      ...base,
      data: [
        { id: "north", facet: "North", x: 1, y: 1 },
        { id: "south", facet: "South", x: 2, y: 2 },
      ],
    });
    await until(() => model?.scene.panels.length === 2);
    const north = model!.scene.panels.find((panel) => panel.strip === "North")!;
    interaction.setInterval(
      {
        panelId: north.id,
        preset: "independent",
        domains: { x: { kind: "linear", domain: [0, 2] } },
        keys: ["north"],
      },
      { scope: interactionScope },
    );
    const edit = await new Promise<HTMLButtonElement>((resolve, reject) => {
      const started = performance.now();
      const find = () => {
        const button = [
          ...view.container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
        ].find((candidate) => candidate.textContent?.trim() === "Edit x selection bounds: North");
        if (button !== undefined) {
          resolve(button);
          return;
        }
        if (performance.now() - started > 2000) {
          reject(new Error("edit control missing"));
          return;
        }
        requestAnimationFrame(find);
      };
      find();
    });
    edit.click();
    await until(() => view.container.querySelector(".gg-bounds-editor") !== null);

    await view.rerender({
      ...base,
      data: [{ id: "south", facet: "South", x: 2, y: 2 }],
    });
    await until(() => view.container.querySelector(".gg-bounds-editor") === null);
    await until(() =>
      (view.container.querySelector("[aria-live='polite']")?.textContent ?? "").includes(
        "Bounds editing cancelled because North is no longer available.",
      ),
    );
    expect(document.activeElement).toBe(view.container.querySelector(".gg-capture"));
    expect(view.container.querySelector("[aria-live='polite']")?.textContent).toContain(
      "Bounds editing cancelled because North is no longer available.",
    );
    const recoveryButtons = [
      ...view.container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ];
    expect(
      recoveryButtons.some((button) =>
        button.textContent?.trim().startsWith("Edit x selection bounds"),
      ),
    ).toBe(false);
    expect(
      recoveryButtons.some(
        (button) => button.textContent?.trim() === "Clear panel selection: unavailable panel",
      ),
    ).toBe(true);
  });
});

describe("accessible keyboard instructions", () => {
  it("describes inspect, select-area, and zoom-area truthfully", async () => {
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "x",
      inspect: true,
      select: { type: "interval" },
      zoom: true,
      ...size,
    });
    const capture = container.querySelector<HTMLElement>(".gg-capture")!;
    const description = () => {
      const id = capture.getAttribute("aria-describedby")?.split(" ")[0];
      return id === undefined
        ? ""
        : (container.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.textContent ?? "");
    };
    expect(description()).toContain("Use Arrow keys to inspect data");
    expect(description()).toContain("Enter or Space to pin");

    const tool = (label: string) =>
      [...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button")].find(
        (button) => button.textContent?.trim() === label,
      )!;
    tool("Select area").click();
    await until(() => description().includes("selection corner"));
    expect(description()).toContain("Enter or Space");
    expect(description()).toContain("Arrow keys");
    expect(description()).toContain("Shift");
    expect(description()).toContain("Escape to cancel");

    tool("Zoom area").click();
    await until(() => description().includes("zoom corner"));
    expect(description()).toContain("Enter or Space");
    expect(description()).toContain("Arrow keys");
    expect(description()).toContain("Shift");
    expect(description()).toContain("Escape to cancel");
  });
});

describe("canvas strata (decision 0006 graduated)", () => {
  const canvasProps = {
    data: rows,
    aes: { x: "x", y: "y" },
    layers: [
      {
        geom: "point" as const,
        render: "canvas" as const,
        params: { size: 6 },
      },
    ],
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
    const { container } = render(GGPlot, { ...canvasProps, inspect: true });
    const root = container.querySelector<HTMLElement>(".gg-plot-root")!;
    for (const el of root.querySelectorAll(".gg-stratum, canvas")) {
      expect(getComputedStyle(el).zIndex).toBe("auto");
      expect(getComputedStyle(el).pointerEvents).toBe("none");
    }
    const capture = root.querySelector(".gg-capture")!;
    expect(getComputedStyle(capture).pointerEvents).toBe("auto");
    expect([...root.children].indexOf(capture)).toBeGreaterThan(
      [...root.children].indexOf(root.querySelector("canvas.gg-canvas")!),
    );
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

  it("canvas a11y open state is shared across interleaved canvas strata", async () => {
    // canvas → svg → canvas yields two canvas strata (contiguous same-backend merges).
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [
        { geom: "point" as const, render: "canvas" as const, params: { size: 6 } },
        { geom: "line" as const },
        { geom: "point" as const, render: "canvas" as const, params: { size: 4 } },
      ],
      theme: "light" as const,
      ...size,
    });
    const toggles = [...container.querySelectorAll<HTMLButtonElement>(".gg-a11y-toggle")];
    expect(toggles).toHaveLength(2);
    expect(toggles.every((t) => t.getAttribute("aria-expanded") === "false")).toBe(true);
    expect(container.querySelectorAll(".gg-a11y-table")).toHaveLength(0);
    toggles[0]?.click();
    await until(() => container.querySelectorAll(".gg-a11y-table").length === 2);
    expect(
      [...container.querySelectorAll(".gg-a11y-toggle")].every(
        (t) => t.getAttribute("aria-expanded") === "true",
      ),
    ).toBe(true);
  });

  it('a11y "force-svg" keeps marks in SVG with one virtual-navigation surface', () => {
    const { container } = render(GGPlot, {
      ...canvasProps,
      a11y: "force-svg",
      inspect: true,
    });
    expect(container.querySelector("canvas")).toBeNull();
    const circles = container.querySelectorAll("circle[tabindex='0']");
    expect(circles).toHaveLength(0);
    expect(container.querySelectorAll(".gg-capture[tabindex='0']")).toHaveLength(1);
  });
});

describe("hover + tooltip (overlays, never a pipeline re-run)", () => {
  function pointerMoveAt(capture: Element, x: number, y: number): void {
    const rect = capture.getBoundingClientRect();
    capture.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: rect.left + (x / size.width) * rect.width,
        clientY: rect.top + (y / size.height) * rect.height,
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
});

describe("brush + brush-to-zoom", () => {
  function drag(capture: Element, x0: number, y0: number, x1: number, y1: number): void {
    const rect = capture.getBoundingClientRect();
    const opts = (x: number, y: number) => ({
      clientX: rect.left + (x / size.width) * rect.width,
      clientY: rect.top + (y / size.height) * rect.height,
      bubbles: true,
      button: 0,
      pointerId: 1,
    });
    capture.dispatchEvent(new PointerEvent("pointerdown", opts(x0, y0)));
    capture.dispatchEvent(new PointerEvent("pointermove", opts((x0 + x1) / 2, (y0 + y1) / 2)));
    capture.dispatchEvent(new PointerEvent("pointerup", opts(x1, y1)));
  }

  it("starts an interval from precise bounds without a brush", async () => {
    let renderCount = 0;
    const selections: Array<{
      keys: readonly PropertyKey[];
      source: string;
    }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "x",
      select: { type: "interval", mode: "x" },
      onselect: (event: { phase: string; keys: readonly PropertyKey[]; source: string }) => {
        if (event.phase === "end") selections.push(event);
      },
      onrender: () => {
        renderCount += 1;
      },
      ...size,
    });
    const setBounds = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent?.trim() === "Set x selection bounds")!;
    expect(setBounds).not.toBeUndefined();
    const rendersBeforeEdit = renderCount;
    setBounds.click();
    await until(() => container.querySelector('.gg-bounds-editor input[id$="-lower"]') !== null);
    const [lower, upper] = [
      ...container.querySelectorAll<HTMLInputElement>(".gg-bounds-editor input"),
    ];
    lower.value = "1.5";
    lower.dispatchEvent(new InputEvent("input", { bubbles: true }));
    upper.value = "2.5";
    upper.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(renderCount).toBe(rendersBeforeEdit);

    container.querySelector<HTMLButtonElement>('.gg-bounds-editor button[type="submit"]')!.click();
    await until(() => selections.length === 1);

    expect(selections[0]).toMatchObject({ keys: [2], source: "keyboard" });
    expect(renderCount).toBe(rendersBeforeEdit);
    expect(document.activeElement).toBe(setBounds);
  });

  it("publishes typed native band-brush domains and semantic records", async () => {
    let model: RenderModel | null = null;
    const ended: Array<{
      domain: { x?: readonly [unknown, unknown] };
      keys: readonly PropertyKey[];
    }> = [];
    const interaction = createPlotInteraction<string>();
    const interactionScope = {
      keys: "typed-brush",
      intervals: "typed-brush",
    } as const;
    const { container } = render(GGPlot, {
      data: [
        { id: "number", x: 1, y: 1 },
        { id: "string", x: "1", y: 2 },
      ],
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      scales: { x: { type: "band" } },
      key: "id",
      select: { type: "interval", mode: "x", preset: "cross-panel" },
      interaction,
      interactionScope,
      onselect: (event: {
        phase: string;
        domain: { x?: readonly [unknown, unknown] };
        keys: readonly PropertyKey[];
      }) => {
        if (event.phase === "end") ended.push(event);
      },
      onrender: (next: RenderModel) => {
        model = next;
      },
      ...size,
    });
    await until(() => model !== null);
    const first = model!.candidates.candidate(0)!;
    const second = model!.candidates.candidate(1)!;
    const halfGap = Math.abs(second.x - first.x) / 2;
    const capture = container.querySelector(".gg-capture")!;
    const selectArea = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent === "Select area")!;
    selectArea.click();
    await until(() => selectArea.getAttribute("aria-pressed") === "true");
    drag(capture, first.x - halfGap + 1, first.y - 8, first.x + halfGap - 1, first.y + 8);
    await until(() => ended.length === 1);

    expect(ended[0]).toEqual(expect.objectContaining({ domain: { x: [1, 1] }, keys: ["number"] }));
    expect(interaction.intervals(interactionScope)[0]).toMatchObject({
      preset: "cross-panel",
      domains: { x: { kind: "band", values: [encodeKey(1)] } },
      keys: ["number"],
    });
  });

  it("clears the committed brush rectangle when the controller clears the interval", async () => {
    let model: RenderModel | null = null;
    const interaction = createPlotInteraction<string>();
    const interactionScope = {
      keys: "stale-rect",
      intervals: "stale-rect",
    } as const;
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "x",
      select: { type: "interval", mode: "x", persistent: true },
      interaction,
      interactionScope,
      onrender: (next: RenderModel) => {
        model = next;
      },
      ...size,
    });
    await until(() => model !== null);
    const capture = container.querySelector(".gg-capture")!;
    const selectArea = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent === "Select area")!;
    selectArea.click();
    await until(() => selectArea.getAttribute("aria-pressed") === "true");
    const first = model!.candidates.candidate(0)!;
    const last = model!.candidates.candidate(2)!;
    drag(capture, first.x - 5, first.y - 10, last.x + 5, last.y + 10);
    await until(() => interaction.intervals(interactionScope).length === 1);
    await until(() => container.querySelector(".gg-selection") !== null);

    // A linked chart (here: programmatic) clears the shared interval; the
    // local pixel rectangle must not outlive its semantic record.
    interaction.clearIntervals({ scope: interactionScope });
    await until(() => container.querySelector(".gg-selection") === null);
  });

  it("clears the committed brush rectangle when a linked chart replaces the same-panel interval", async () => {
    let model: RenderModel | null = null;
    const interaction = createPlotInteraction<string>();
    const interactionScope = {
      keys: "replaced-rect",
      intervals: "replaced-rect",
    } as const;
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "x",
      select: { type: "interval", mode: "x", persistent: true },
      interaction,
      interactionScope,
      onrender: (next: RenderModel) => {
        model = next;
      },
      ...size,
    });
    await until(() => model !== null);
    const capture = container.querySelector(".gg-capture")!;
    const selectArea = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent === "Select area")!;
    selectArea.click();
    await until(() => selectArea.getAttribute("aria-pressed") === "true");
    const first = model!.candidates.candidate(0)!;
    const last = model!.candidates.candidate(2)!;
    drag(capture, first.x - 5, first.y - 10, last.x + 5, last.y + 10);
    await until(() => interaction.intervals(interactionScope).length === 1);
    await until(() => container.querySelector(".gg-selection") !== null);

    // A linked chart replaces this panel's interval with new domains: the
    // old pixels no longer depict the semantic record, so the rectangle
    // must clear even though a record still exists for the panel.
    const record = interaction.intervals(interactionScope)[0];
    interaction.setInterval(
      {
        panelId: record.panelId,
        preset: record.preset,
        domains: { x: { kind: "linear", domain: [1, 2] } },
        keys: ["replacement"],
      },
      { scope: interactionScope },
    );
    await until(() => container.querySelector(".gg-selection") === null);
  });

  it("treats a brush on an empty facet panel as an empty selection", async () => {
    let model: RenderModel | null = null;
    const interaction = createPlotInteraction<string>();
    const interactionScope = {
      keys: "empty-panel",
      intervals: "empty-panel",
    } as const;
    const ended: Array<{ keys: readonly PropertyKey[] }> = [];
    const { container } = render(GGPlot, {
      data: [
        { id: "p", r: "r1", c: "c1", cat: "m", y: 1 },
        { id: "q", r: "r2", c: "c2", cat: "n", y: 2 },
      ],
      aes: { x: "cat", y: "y" },
      layers: [{ geom: "point" }],
      scales: { x: { type: "band" } },
      facet: { rows: "r", cols: "c", scales: "free" },
      key: "id",
      select: { type: "interval", mode: "x", persistent: true },
      interaction,
      interactionScope,
      onselect: (event: { phase: string; keys: readonly PropertyKey[] }) => {
        if (event.phase === "end") ended.push(event);
      },
      onrender: (next: RenderModel) => {
        model = next;
      },
      ...size,
    });
    await until(() => model !== null);
    // The r1/c2 combination has no rows: with free scales its band domain is
    // empty, so no semantic axis survives the x selection mode. Brushing it
    // must complete as an empty selection instead of committing an axis-less
    // record (which the controller rejects with a TypeError).
    const empty = model!.scene.panels.find((panel) => panel.strip === "r1 / c2")!;
    expect(empty).not.toBeUndefined();
    const capture = container.querySelector(".gg-capture")!;
    const selectArea = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent === "Select area")!;
    selectArea.click();
    await until(() => selectArea.getAttribute("aria-pressed") === "true");
    drag(
      capture,
      empty.x + empty.width / 4,
      empty.y + empty.height / 4,
      empty.x + (empty.width * 3) / 4,
      empty.y + (empty.height * 3) / 4,
    );
    await until(() => ended.length === 1);
    expect(ended[0].keys).toEqual([]);
    expect(interaction.intervals(interactionScope)).toEqual([]);
  });

  it("keeps precise bounds nonpersistent when selection is nonpersistent", async () => {
    let model: RenderModel | null = null;
    const interaction = createPlotInteraction<string>();
    const interactionScope = {
      keys: "nonpersistent-bounds",
      intervals: "nonpersistent-bounds",
    } as const;
    const ended: Array<{ keys: readonly PropertyKey[] }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "x",
      select: { type: "interval", mode: "x", persistent: false },
      interaction,
      interactionScope,
      onselect: (event: { phase: string; keys: readonly PropertyKey[] }) => {
        if (event.phase === "end") ended.push(event);
      },
      onrender: (next: RenderModel) => {
        model = next;
      },
      ...size,
    });
    await until(() => model !== null);
    const setBounds = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent?.trim() === "Set x selection bounds")!;
    setBounds.click();
    await until(() => container.querySelector('.gg-bounds-editor input[id$="-lower"]') !== null);
    const [lower, upper] = [
      ...container.querySelectorAll<HTMLInputElement>(".gg-bounds-editor input"),
    ];
    lower.value = "1.5";
    lower.dispatchEvent(new InputEvent("input", { bubbles: true }));
    upper.value = "2.5";
    upper.dispatchEvent(new InputEvent("input", { bubbles: true }));
    container.querySelector<HTMLButtonElement>('.gg-bounds-editor button[type="submit"]')!.click();
    await until(() => ended.length === 1);

    // The end event still fires, but `persistent: false` must not leave
    // durable controller state or a committed rectangle behind — precise
    // bounds persist exactly like the brush path.
    expect(ended[0].keys).toEqual([2]);
    expect(interaction.intervals(interactionScope)).toEqual([]);
    expect(container.querySelector(".gg-selection")).toBeNull();
  });

  it("draws the committed rectangle from the applied precise bounds", async () => {
    let model: RenderModel | null = null;
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "x",
      select: { type: "interval", mode: "x", persistent: true },
      onrender: (next: RenderModel) => {
        model = next;
      },
      ...size,
    });
    await until(() => model !== null);
    const setBounds = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent?.trim() === "Set x selection bounds")!;
    setBounds.click();
    await until(() => container.querySelector('.gg-bounds-editor input[id$="-lower"]') !== null);
    const [lower, upper] = [
      ...container.querySelectorAll<HTMLInputElement>(".gg-bounds-editor input"),
    ];
    lower.value = "1.5";
    lower.dispatchEvent(new InputEvent("input", { bubbles: true }));
    upper.value = "2.5";
    upper.dispatchEvent(new InputEvent("input", { bubbles: true }));
    container.querySelector<HTMLButtonElement>('.gg-bounds-editor button[type="submit"]')!.click();
    await until(() => container.querySelector(".gg-selection") !== null);

    // The overlay depicts the applied [1.5, 2.5] interval, not the whole
    // panel: pixel positions are affine in x, so the rect edges sit halfway
    // between adjacent candidate centers.
    const c0 = model!.candidates.candidate(0)!;
    const c1 = model!.candidates.candidate(1)!;
    const c2 = model!.candidates.candidate(2)!;
    const selection = container.querySelector(".gg-selection")!;
    const x = Number(selection.getAttribute("x"));
    const width = Number(selection.getAttribute("width"));
    expect(x).toBeCloseTo((c0.x + c1.x) / 2, 0);
    expect(x + width).toBeCloseTo((c1.x + c2.x) / 2, 0);
  });

  it("draws precise bounds through the post-stat coordinate projector", async () => {
    let model: RenderModel | null = null;
    const data = [1, 10, 100, 1000].map((x) => ({ x, y: 1 }));
    const { container } = render(GGPlot, {
      data,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      scales: { x: { type: "linear", domain: [1, 1000], expand: { mult: 0, add: 0 } } },
      coord: { type: "transform", x: { transform: "log10", expand: false } },
      key: "x",
      select: { type: "interval", mode: "x", persistent: true },
      onrender: (next: RenderModel) => {
        model = next;
      },
      ...size,
    });
    await until(() => model !== null);
    const setBounds = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent?.trim() === "Set x selection bounds")!;
    setBounds.click();
    await until(() => container.querySelector('.gg-bounds-editor input[id$="-lower"]') !== null);
    const [lower, upper] = [
      ...container.querySelectorAll<HTMLInputElement>(".gg-bounds-editor input"),
    ];
    lower.value = "10";
    lower.dispatchEvent(new InputEvent("input", { bubbles: true }));
    upper.value = "100";
    upper.dispatchEvent(new InputEvent("input", { bubbles: true }));
    container.querySelector<HTMLButtonElement>('.gg-bounds-editor button[type="submit"]')!.click();
    await until(() => container.querySelector(".gg-selection") !== null);

    const selection = container.querySelector(".gg-selection")!;
    const x = Number(selection.getAttribute("x"));
    const width = Number(selection.getAttribute("width"));
    expect(x).toBeCloseTo(model!.candidates.candidate(1)!.x, 0);
    expect(x + width).toBeCloseTo(model!.candidates.candidate(2)!.x, 0);
  });

  it("publishes complete shared xy precise domains and source-row lineage", async () => {
    const interaction = createPlotInteraction<string>();
    const interactionScope = {
      keys: "precise-xy",
      intervals: "precise-xy",
    } as const;
    const selections: Array<{
      domain: {
        x?: readonly [unknown, unknown];
        y?: readonly [unknown, unknown];
      };
      keys: readonly PropertyKey[];
      lineageCount: number;
    }> = [];
    interaction.setInterval(
      {
        panelId: "panel:all",
        preset: "independent",
        domains: {
          x: { kind: "linear", domain: [1, 3] },
          y: { kind: "linear", domain: [10, 30] },
        },
        keys: [],
      },
      { scope: interactionScope },
    );
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      select: { type: "interval", mode: "xy" },
      interaction,
      interactionScope,
      onselect: (event: {
        phase: string;
        domain: {
          x?: readonly [unknown, unknown];
          y?: readonly [unknown, unknown];
        };
        keys: readonly PropertyKey[];
        lineageCount: number;
      }) => {
        if (event.phase === "end") selections.push(event);
      },
      ...size,
    });
    const editBounds = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent === "Edit x selection bounds")!;
    editBounds.click();
    await until(() => container.querySelector('.gg-bounds-editor input[id$="-lower"]') !== null);
    const [lower, upper] = [
      ...container.querySelectorAll<HTMLInputElement>(".gg-bounds-editor input"),
    ];
    lower.value = "1.5";
    lower.dispatchEvent(new InputEvent("input", { bubbles: true }));
    upper.value = "2.5";
    upper.dispatchEvent(new InputEvent("input", { bubbles: true }));
    container.querySelector<HTMLButtonElement>('.gg-bounds-editor button[type="submit"]')!.click();
    await until(() => selections.length === 1);

    expect(selections[0]).toEqual(
      expect.objectContaining({
        domain: { x: [1.5, 2.5], y: [10, 30] },
        keys: [],
        lineageCount: 1,
      }),
    );
  });

  it("starts zoom from precise bounds and preserves pointer modality", async () => {
    const zooms: Array<{ source: string; domains: unknown }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      zoom: { mode: "x" },
      onzoom: (event: { source: string; domains: unknown }) => zooms.push(event),
      ...size,
    });
    const setBounds = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent?.trim() === "Set x zoom bounds")!;
    setBounds.click();
    await until(() => container.querySelector('.gg-bounds-editor input[id$="-lower"]') !== null);
    const [lower, upper] = [
      ...container.querySelectorAll<HTMLInputElement>(".gg-bounds-editor input"),
    ];
    lower.value = "1.5";
    lower.dispatchEvent(new InputEvent("input", { bubbles: true }));
    upper.value = "2.5";
    upper.dispatchEvent(new InputEvent("input", { bubbles: true }));
    const apply = container.querySelector<HTMLButtonElement>(
      '.gg-bounds-editor button[type="submit"]',
    )!;
    apply.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerType: "touch",
      }),
    );
    apply.click();
    await until(() => zooms.length === 1);

    expect(zooms[0]).toEqual({
      type: "zoom",
      phase: "end",
      source: "touch",
      domains: { x: [1.5, 2.5] },
    });
  });

  it("opens dedicated precise controls for log, time, reversed, and band scales", async () => {
    const fixtures = [
      {
        name: "log",
        data: [
          { x: 1, y: 1 },
          { x: 100, y: 2 },
        ],
        scales: { x: { type: "log" as const } },
        control: "input[type=number]",
      },
      {
        name: "time",
        data: [
          { x: "2025-01-01T00:00:00.000Z", y: 1 },
          { x: "2025-01-03T00:00:00.000Z", y: 2 },
        ],
        scales: { x: { type: "time" as const } },
        control: "input[type=text]",
      },
      {
        name: "reversed",
        data: [
          { x: 1, y: 1 },
          { x: 3, y: 2 },
        ],
        scales: { x: { type: "linear" as const, reverse: true } },
        control: "input[type=number]",
      },
      {
        name: "band",
        data: [
          { x: "north", y: 1 },
          { x: "south", y: 2 },
        ],
        scales: { x: { type: "band" as const } },
        control: "select",
      },
    ];

    for (const fixture of fixtures) {
      const view = render(
        GGPlot,
        fromPartial({
          data: fixture.data,
          aes: { x: "x", y: "y" },
          layers: [{ geom: "point" }],
          scales: fixture.scales,
          select: { type: "interval", mode: "x" },
          ...size,
        }),
      );
      const setBounds = [
        ...view.container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
      ].find((button) => button.textContent?.trim() === "Set x selection bounds");
      expect(setBounds, fixture.name).not.toBeUndefined();
      setBounds!.click();
      await until(
        () => view.container.querySelector(`.gg-bounds-editor ${fixture.control}`) !== null,
      );
      expect(
        view.container.querySelectorAll(`.gg-bounds-editor ${fixture.control}`),
        fixture.name,
      ).toHaveLength(2);
      view.unmount();
    }
  });

  it("brush selects row indices via the hit-index rect query", async () => {
    let model: RenderModel | null = null;
    let renderCount = 0;
    const selections: PropertyKey[][] = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "x",
      select: "interval",
      onselect: (event: { phase: string; keys: readonly PropertyKey[] }) => {
        if (event.phase === "end") selections.push([...event.keys]);
      },
      onrender: (m: RenderModel) => {
        renderCount += 1;
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
    const selectArea = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent === "Select area")!;
    selectArea.click();
    // A locally chosen tool must survive the next reactive flush. This guards
    // against configuration synchronization accidentally subscribing to and
    // resetting the user's active-tool state.
    await until(() => selectArea.getAttribute("aria-pressed") === "true");
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
    expect(selectArea.getAttribute("aria-pressed")).toBe("true");
    // Rect around the first two points only.
    const xs = [0, 1].map((j) => panel.x + (batch.positions[j * 2] ?? 0));
    const ys = [0, 1].map((j) => panel.y + (batch.positions[j * 2 + 1] ?? 0));
    drag(
      capture,
      Math.max(...xs) + 5,
      Math.max(...ys) + 5,
      Math.min(...xs) - 5,
      Math.min(...ys) - 5,
    );
    await until(() => selections.length > 0);
    expect(selections[0]).toHaveLength(2);
    expect(new Set(selections[0])).toEqual(new Set([1, 2]));

    const rendersAfterBrush = renderCount;
    const editBounds = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent === "Edit x selection bounds")!;
    editBounds.click();
    await until(() => container.querySelector('.gg-bounds-editor input[id$="-lower"]') !== null);
    const upper = container.querySelector<HTMLInputElement>(
      '.gg-bounds-editor input[id$="-upper"]',
    )!;
    upper.value = "1.5";
    upper.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await Promise.resolve();
    expect(renderCount).toBe(rendersAfterBrush);
    container.querySelector<HTMLButtonElement>('.gg-bounds-editor button[type="submit"]')!.click();
    await until(() => selections.length === 2);
    expect(selections[1]).toEqual([1]);
    expect(renderCount).toBe(rendersAfterBrush);
    expect(document.activeElement).toBe(editBounds);
  });

  it("keeps the first facet as origin during two-corner pointer selection", async () => {
    let model: RenderModel | null = null;
    let endedPanelId: string | null | undefined;
    const { container } = render(GGPlot, {
      data: [
        { id: "north-1", region: "north", x: 1, y: 1 },
        { id: "south-1", region: "south", x: 2, y: 2 },
      ],
      aes: { x: "x", y: "y" },
      facet: { wrap: "region" },
      layers: [{ geom: "point" }],
      key: "id",
      select: "interval",
      onselect: (event: { phase: string; panelId?: string | null }) => {
        if (event.phase === "end") endedPanelId = event.panelId;
      },
      onrender: (next: RenderModel) => {
        model = next;
      },
      ...size,
    });
    const panels = requireModel(model).scene.panels;
    expect(panels).toHaveLength(2);
    const first = panels[0];
    const second = panels[1];
    if (first === undefined || second === undefined) throw new Error("expected two facet panels");
    const capture = container.querySelector(".gg-capture")!;
    const selectArea = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent === "Select area")!;
    selectArea.click();
    await until(() => selectArea.getAttribute("aria-pressed") === "true");

    const bounds = capture.getBoundingClientRect();
    const pointer = (type: "pointerdown" | "pointerup", x: number, y: number) =>
      capture.dispatchEvent(
        new PointerEvent(type, {
          clientX: bounds.left + (x / size.width) * bounds.width,
          clientY: bounds.top + (y / size.height) * bounds.height,
          bubbles: true,
          button: 0,
          pointerId: 7,
        }),
      );
    const firstCorner = {
      x: first.x + first.width / 2,
      y: first.y + first.height / 2,
    };
    const secondCorner = {
      x: second.x + second.width / 2,
      y: second.y + second.height / 2,
    };
    pointer("pointerdown", firstCorner.x, firstCorner.y);
    pointer("pointerup", firstCorner.x, firstCorner.y);
    pointer("pointerdown", secondCorner.x, secondCorner.y);
    pointer("pointerup", secondCorner.x, secondCorner.y);

    await until(() => endedPanelId !== undefined);
    expect(endedPanelId).toBe(first.id);
  });

  it("brush zoom replaces explicit coordinate limits with the brushed viewport", async () => {
    let model: RenderModel | null = null;
    const { container } = render(GGPlot, {
      data: [1, 10, 100, 1000].map((x) => ({ x, y: 1 })),
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      scales: { x: { type: "linear", domain: [1, 1000], expand: { mult: 0, add: 0 } } },
      coord: {
        type: "transform",
        x: { transform: "log10", limits: [1, 1000], expand: false },
      },
      zoom: { mode: "x" },
      onrender: (next: RenderModel) => {
        model = next;
      },
      ...size,
    });
    await until(() => model !== null);
    const before = requireModel(model);
    const panel = before.scene.panels[0];
    const capture = container.querySelector(".gg-capture")!;
    const zoomArea = [
      ...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button"),
    ].find((button) => button.textContent === "Zoom area")!;
    zoomArea.click();
    await until(() => zoomArea.getAttribute("aria-pressed") === "true");
    drag(
      capture,
      panel.x + panel.width / 3,
      panel.y,
      panel.x + (panel.width * 2) / 3,
      panel.y + panel.height,
    );
    await until(() => model !== before);

    const after = requireModel(model);
    if (after.scales.x.type === "band") throw new Error("expected continuous x scale");
    expect(after.scales.x.domain[0]).toBeCloseTo(10, 4);
    expect(after.scales.x.domain[1]).toBeCloseTo(100, 4);
    expect(after.coordProjectors[0].x.coordinateDomain[0]).toBeCloseTo(1, 4);
    expect(after.coordProjectors[0].x.coordinateDomain[1]).toBeCloseTo(2, 4);
  });

  it("brush-to-zoom respecs explicit domains; colors NEVER shift; double-click resets", async () => {
    let model: RenderModel | null = null;
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y", color: "cls" },
      layers: [{ geom: "point" }],
      zoom: true,
      inspect: true,
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
    [...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button")]
      .find((button) => button.textContent === "Zoom area")!
      .click();
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
    expect(after.domains.baseline).toEqual(before.domains.effective);
    expect(after.domains.effective).not.toEqual(after.domains.baseline);
    // The x domain narrowed (explicit domain respec via scale inversion).
    const beforeX = (before.scales.x as { domain: [number, number] }).domain;
    const afterX = (after.scales.x as { domain: [number, number] }).domain;
    expect(afterX[0]).toBeGreaterThan(beforeX[0]);
    // Scale limits now censor before stats, so out-of-domain points are
    // removed rather than retained at clipped negative pixels.
    expect(container.querySelectorAll("circle").length).toBeLessThan(initialFills.length);
    // Every surviving series keeps its existing assignment (prevScales flows
    // through the natural-baseline and effective runs).
    const initialFillSet = new Set(initialFills);
    expect(fillsByClass().every((fill) => initialFillSet.has(fill))).toBe(true);

    // Double-click resets the zoom.
    capture.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await until(() =>
      [...container.querySelectorAll("circle")].every((c) => Number(c.getAttribute("cx")) >= 0),
    );
    expect(fillsByClass()).toEqual(initialFills);
  });
});

describe("point selection", () => {
  it("uses stable keys and exposes a visible clear action", async () => {
    let model: RenderModel | null = null;
    const events: Array<{ phase: string; keys: readonly PropertyKey[] }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "x",
      select: "point",
      onselect: (event: { phase: string; keys: readonly PropertyKey[] }) => events.push(event),
      onrender: (next: RenderModel) => (model = next),
      ...size,
    });
    const candidate = model!.candidates.candidate(0)!;
    const capture = container.querySelector(".gg-capture")!;
    const rect = capture.getBoundingClientRect();
    capture.dispatchEvent(
      new MouseEvent("click", {
        clientX: rect.left + (candidate.x / size.width) * rect.width,
        clientY: rect.top + (candidate.y / size.height) * rect.height,
        bubbles: true,
      }),
    );
    await until(() => events.length === 1);
    expect(events[0]?.keys).toEqual([1]);
    expect(container.querySelector(".gg-selected-ring")).not.toBeNull();
    const clear = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Clear selection",
    )!;
    clear.click();
    await until(() => events.length === 2);
    expect(events[1]).toMatchObject({ phase: "clear", keys: [] });
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
    await second.rerender(fromPartial({ data: rows.slice(0, 2) }));
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
