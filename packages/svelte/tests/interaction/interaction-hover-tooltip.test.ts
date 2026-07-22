import { describe, expect, it, vi } from "vitest";

import type { RenderModel } from "@ggsvelte/core";
import GGPlot from "../../src/lib/GGPlot.svelte";
import { render } from "../helpers/render.js";
import { until } from "../helpers/until.js";
import { rows, size } from "./interaction-harness.js";

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
