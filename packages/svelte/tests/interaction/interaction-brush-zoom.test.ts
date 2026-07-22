import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import { encodeKey, type RenderModel } from "@ggsvelte/core";
import GGPlot from "../../src/lib/GGPlot.svelte";
import { createPlotInteraction } from "../../src/lib/interaction/controller.svelte.js";
import { render } from "../helpers/render.js";
import { until } from "../helpers/until.js";
import { rows, size, requireModel } from "./interaction-harness.js";

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
