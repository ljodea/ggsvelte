import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import type { RenderModel } from "@ggsvelte/core";

import GGPlot from "../src/lib/GGPlot.svelte";
import InteractiveTooltipPlot from "./fixtures/InteractiveTooltipPlot.svelte";
import LongTooltipPlot from "./fixtures/LongTooltipPlot.svelte";
import ProgrammaticZoomPlot from "./fixtures/ProgrammaticZoomPlot.svelte";
import { expectAccessible } from "./helpers/accessibility.js";
import { render } from "./helpers/render.js";

const rows = [
  { id: "a", x: 1, y: 10, group: "one" },
  { id: "b", x: 2, y: 20, group: "two" },
  { id: "c", x: 3, y: 15, group: "one" },
];
const size = { width: 480, height: 320 };

function pointEvent(
  capture: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  x: number,
  y: number,
  pointerType = "mouse",
  pointerId = 1,
): PointerEvent {
  const rect = capture.getBoundingClientRect();
  const event = new PointerEvent(type, {
    bubbles: true,
    button: 0,
    buttons: type === "pointerup" ? 0 : 1,
    clientX: rect.left + (x / size.width) * rect.width,
    clientY: rect.top + (y / size.height) * rect.height,
    pointerId,
    pointerType,
  });
  capture.dispatchEvent(event);
  return event;
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

function tool(container: HTMLElement, label: string): HTMLButtonElement {
  return [...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button")].find(
    (button) => button.textContent === label,
  )!;
}

async function dragArea(
  container: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
  label = "Select area",
): Promise<void> {
  await expect.poll(() => tool(container, label).disabled).toBe(false);
  tool(container, label).click();
  await expect.poll(() => tool(container, label).getAttribute("aria-pressed")).toBe("true");
  const capture = container.querySelector(".gg-capture")!;
  pointEvent(capture, "pointerdown", from.x, from.y);
  pointEvent(capture, "pointermove", to.x, to.y);
  pointEvent(capture, "pointerup", to.x, to.y);
}

describe("R0 interaction evidence", () => {
  it("coalesces pointer inspection to the last event per animation frame and cancels on leave", async () => {
    let model: RenderModel | null = null;
    const changes: Array<{ focus: { row: Record<string, unknown> | null } }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: true,
      onrender: (next: RenderModel) => (model = next),
      oninspect: (event: { phase: string; focus?: { row: Record<string, unknown> | null } }) => {
        if (event.phase === "change" && event.focus !== undefined)
          changes.push({ focus: event.focus });
      },
      ...size,
    });
    const capture = container.querySelector(".gg-capture")!;
    for (const id of [0, 1, 2]) {
      const candidate = model!.candidates.candidate(id)!;
      pointEvent(capture, "pointermove", candidate.x, candidate.y);
    }
    expect(changes).toHaveLength(0);
    await nextFrame();
    expect(changes).toHaveLength(1);
    expect(changes[0].focus.row?.["id"]).toBe("c");

    const first = model!.candidates.candidate(0)!;
    pointEvent(capture, "pointermove", first.x, first.y);
    capture.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    await nextFrame();
    expect(changes).toHaveLength(1);
    expect(container.querySelector(".gg-tooltip")).toBeNull();
  });

  it("coalesces area changes to one per frame and pointerup ends with the latest point", async () => {
    const events: Array<{
      phase: string;
      pixels: { x0: number; y0: number; x1: number; y1: number };
    }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      select: "interval",
      onselect: (event: {
        phase: string;
        pixels: { x0: number; y0: number; x1: number; y1: number };
      }) => events.push(event),
      ...size,
    });
    await expect.poll(() => tool(container, "Select area").disabled).toBe(false);
    tool(container, "Select area").click();
    await expect
      .poll(() => tool(container, "Select area").getAttribute("aria-pressed"))
      .toBe("true");
    const capture = container.querySelector(".gg-capture")!;
    pointEvent(capture, "pointerdown", 100, 80);
    events.length = 0;
    for (const [x, y] of [
      [150, 120],
      [220, 170],
      [300, 230],
    ] as const)
      pointEvent(capture, "pointermove", x, y);
    expect(events).toHaveLength(0);
    await nextFrame();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      phase: "change",
      pixels: { x1: 300, y1: 230 },
    });

    pointEvent(capture, "pointermove", 340, 250);
    pointEvent(capture, "pointerup", 360, 270);
    await nextFrame();
    expect(events.at(-1)).toMatchObject({
      phase: "end",
      pixels: { x1: 360, y1: 270 },
    });
    expect(events.filter((event) => event.phase === "change")).toHaveLength(1);
  });

  it("pins a touch tap with touch provenance while leaving inspect touch scrolling enabled", async () => {
    let model: RenderModel | null = null;
    const changes: Array<{ state?: string; source?: string }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: true,
      onrender: (next: RenderModel) => (model = next),
      oninspect: (event: { phase: string; state?: string; source?: string }) => {
        if (event.phase === "change") changes.push(event);
      },
      ...size,
    });
    const capture = container.querySelector<HTMLElement>(".gg-capture")!;
    expect(getComputedStyle(capture).touchAction).toContain("pan-y");
    const candidate = model!.candidates.candidate(1)!;
    const down = pointEvent(capture, "pointerdown", candidate.x, candidate.y, "touch", 9);
    const up = pointEvent(capture, "pointerup", candidate.x, candidate.y, "touch", 9);
    expect(down.defaultPrevented || up.defaultPrevented).toBe(false);
    await expect.poll(() => changes.at(-1)?.state).toBe("pinned");
    expect(changes.at(-1)?.source).toBe("touch");
    capture.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextFrame();
    expect(changes.at(-1)?.state).toBe("pinned");
  });

  it("drops a queued touch-inspect hover once drag crosses the move threshold", async () => {
    let model: RenderModel | null = null;
    const changes: Array<{ phase: string; state?: string }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: true,
      onrender: (next: RenderModel) => (model = next),
      oninspect: (event: { phase: string; state?: string }) => {
        if (event.phase === "change") changes.push(event);
      },
      ...size,
    });
    const capture = container.querySelector<HTMLElement>(".gg-capture")!;
    const candidate = model!.candidates.candidate(1)!;
    // Host cleanup under test: unmoved move schedules inspect; drag cancel must
    // clear the queue and cancel the scheduled frame before it can fire.
    pointEvent(capture, "pointerdown", candidate.x, candidate.y, "touch", 12);
    pointEvent(capture, "pointermove", candidate.x, candidate.y, "touch", 12);
    pointEvent(capture, "pointermove", candidate.x + 40, candidate.y + 40, "touch", 12);
    await nextFrame();
    await nextFrame();
    expect(changes).toHaveLength(0);
    // pointerup after drag must also not pin (touch-inspect-drag-ignore path).
    pointEvent(capture, "pointerup", candidate.x + 40, candidate.y + 40, "touch", 12);
    await nextFrame();
    expect(changes).toHaveLength(0);
  });

  it("completes touch-drag selection with touch provenance and no JavaScript cancellation", async () => {
    const events: Array<{ phase: string; source: string }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      select: "interval",
      onselect: (event: { phase: string; source: string }) => events.push(event),
      ...size,
    });
    await expect.poll(() => tool(container, "Select area").disabled).toBe(false);
    tool(container, "Select area").click();
    await expect
      .poll(() => tool(container, "Select area").getAttribute("aria-pressed"))
      .toBe("true");
    const capture = container.querySelector<HTMLElement>(".gg-capture")!;
    expect(getComputedStyle(capture).touchAction).toBe("none");
    const down = pointEvent(capture, "pointerdown", 100, 80, "touch", 17);
    const move = pointEvent(capture, "pointermove", 340, 250, "touch", 17);
    const up = pointEvent(capture, "pointerup", 360, 270, "touch", 17);
    expect(down.defaultPrevented || move.defaultPrevented || up.defaultPrevented).toBe(false);
    await expect.poll(() => events.some((event) => event.phase === "end")).toBe(true);
    expect(events.find((event) => event.phase === "end")?.source).toBe("touch");
  });

  it.each(["mouse", "touch"])(
    "completes a two-corner interval with %s input",
    async (pointerType) => {
      const selections: Array<{
        phase: string;
        source: string;
        pixels: unknown;
      }> = [];
      const { container } = render(GGPlot, {
        data: rows,
        aes: { x: "x", y: "y" },
        layers: [{ geom: "point" }],
        key: "id",
        select: "interval",
        onselect: (event: { phase: string; source: string; pixels: unknown }) =>
          selections.push(event),
        ...size,
      });
      await expect.poll(() => tool(container, "Select area").disabled).toBe(false);
      tool(container, "Select area").click();
      await expect
        .poll(() => tool(container, "Select area").getAttribute("aria-pressed"))
        .toBe("true");
      const capture = container.querySelector(".gg-capture")!;
      pointEvent(capture, "pointerdown", 110, 90, pointerType, 2);
      pointEvent(capture, "pointerup", 110, 90, pointerType, 2);
      await expect.poll(() => container.querySelector(".gg-area-draft")).not.toBeNull();
      pointEvent(capture, "pointerdown", 360, 250, pointerType, 3);
      pointEvent(capture, "pointerup", 360, 250, pointerType, 3);
      await expect.poll(() => selections.some((event) => event.phase === "end")).toBe(true);
      expect(selections.find((event) => event.phase === "end")?.source).toBe(
        pointerType === "touch" ? "touch" : "pointer",
      );
    },
  );

  it("completes an interval with Enter, arrows, and Enter and returns an idle area tool to Inspect", async () => {
    const selections: Array<{ phase: string; source: string }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: true,
      select: "interval",
      onselect: (event: { phase: string; source: string }) => selections.push(event),
      ...size,
    });
    await expect.poll(() => tool(container, "Select area").disabled).toBe(false);
    tool(container, "Select area").click();
    await expect
      .poll(() => tool(container, "Select area").getAttribute("aria-pressed"))
      .toBe("true");
    const surface = container.querySelector<HTMLElement>(".gg-capture")!;
    surface.focus();
    for (const key of ["Enter", "ArrowRight", "ArrowDown", "Enter"])
      surface.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey: true, bubbles: true }));
    await expect.poll(() => selections.some((event) => event.phase === "end")).toBe(true);
    expect(selections.find((event) => event.phase === "end")?.source).toBe("keyboard");
    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect.poll(() => tool(container, "Inspect").getAttribute("aria-pressed")).toBe("true");
  });

  it("renders a custom interactive tooltip; Close and Escape restore chart focus; outside dismisses", async () => {
    const { container } = render(InteractiveTooltipPlot);
    const surface = container.querySelector<HTMLElement>(".gg-capture")!;
    surface.focus();
    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await expect.poll(() => container.querySelector("[data-custom-tooltip]")).not.toBeNull();
    const close = container.querySelector<HTMLButtonElement>(".gg-tooltip button")!;
    close.focus();
    close.click();
    await expect.poll(() => container.querySelector(".gg-tooltip")).toBeNull();
    expect(document.activeElement).toBe(surface);

    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await expect.poll(() => container.querySelector(".gg-tooltip")).not.toBeNull();
    container.querySelector<HTMLElement>(".gg-tooltip")!.focus();
    container
      .querySelector(".gg-tooltip")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect.poll(() => container.querySelector(".gg-tooltip")).toBeNull();
    expect(document.activeElement).toBe(surface);

    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await expect.poll(() => container.querySelector(".gg-tooltip")).not.toBeNull();
    container
      .querySelector("[data-outside]")!
      .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await expect.poll(() => container.querySelector(".gg-tooltip")).toBeNull();
  });

  it("keeps keyed band interval selection with inclusive categorical endpoints", async () => {
    const diagnostics: Array<{ code: string; prop: string; actual?: unknown }> = [];
    const selections: Array<{
      keys: readonly PropertyKey[];
      domain: { x?: unknown };
    }> = [];
    const { container } = render(GGPlot, {
      data: [
        { id: "a", category: "A", value: 1 },
        { id: "b", category: "B", value: 2 },
      ],
      aes: { x: "category", y: "value" },
      layers: [{ geom: "col" }],
      key: "id",
      select: { type: "interval", mode: "x" },
      ondiagnostic: (diagnostic: { code: string; prop: string; actual?: unknown }) =>
        diagnostics.push(diagnostic),
      onselect: (event: {
        phase: string;
        keys: readonly PropertyKey[];
        domain: { x?: unknown };
      }) => {
        if (event.phase === "end") selections.push(event);
      },
      ...size,
    });
    await dragArea(container, { x: 45, y: 50 }, { x: 470, y: 280 });
    await expect.poll(() => selections.length).toBe(1);
    expect(selections[0].keys).toHaveLength(2);
    expect(selections[0].domain.x).toEqual(["A", "B"]);
    expect(diagnostics.some((item) => item.code === "INTERACTION_INTERVAL_SCALE_UNSUPPORTED")).toBe(
      false,
    );
    expect(container.querySelector(".gg-capability-status")).toBeNull();
  });

  it("disables band-only zoom with matching diagnostic and tool rail", async () => {
    const diagnostics: Array<{ code: string; prop: string }> = [];
    const { container } = render(GGPlot, {
      data: [
        { category: "A", value: 1 },
        { category: "B", value: 2 },
      ],
      aes: { x: "category", y: "value" },
      layers: [{ geom: "col" }],
      zoom: { mode: "x" },
      ondiagnostic: (diagnostic: { code: string; prop: string }) => diagnostics.push(diagnostic),
      ...size,
    });
    await expect
      .poll(() =>
        diagnostics.some((item) => item.code === "INTERACTION_INTERVAL_SCALE_UNSUPPORTED"),
      )
      .toBe(true);
    expect(container.querySelectorAll(".gg-tool-rail button")).toHaveLength(0);
    expect(container.querySelector(".gg-capability-status")?.textContent).toContain("unavailable");
  });

  it("surfaces synthesized aggregate values and lineage, and selects aggregate source keys", async () => {
    let model: RenderModel | null = null;
    const inspections: Array<{
      focus: {
        row: unknown;
        sourceKeys: readonly PropertyKey[];
        lineageCount: number;
      };
    }> = [];
    const selections: Array<{ keys: readonly PropertyKey[] }> = [];
    const data = Array.from({ length: 20 }, (_, index) => ({
      id: `row-${index}`,
      value: index % 5,
    }));
    const { container } = render(GGPlot, {
      data,
      aes: { x: "value" },
      layers: [{ geom: "histogram", params: { bins: 5 } }],
      key: "id",
      inspect: true,
      select: "point",
      onrender: (next: RenderModel) => (model = next),
      oninspect: (event: {
        phase: string;
        focus?: {
          row: unknown;
          sourceKeys: readonly PropertyKey[];
          lineageCount: number;
        };
      }) => {
        if (event.phase === "change" && event.focus !== undefined)
          inspections.push({ focus: event.focus });
      },
      onselect: (event: { phase: string; keys: readonly PropertyKey[] }) => {
        if (event.phase === "end") selections.push(event);
      },
      ...size,
    });
    const aggregate = Array.from({ length: model!.candidates.size }, (_, id) =>
      model!.candidates.candidate(id),
    ).find((candidate) => candidate?.rowIndex === null)!;
    const capture = container.querySelector(".gg-capture")!;
    pointEvent(capture, "pointermove", aggregate.x, aggregate.y);
    await nextFrame();
    expect(inspections.at(-1)?.focus.row).toBeNull();
    expect(inspections.at(-1)?.focus.sourceKeys.length).toBeGreaterThan(1);
    expect(inspections.at(-1)?.focus.lineageCount).toBeGreaterThan(1);
    expect(
      [...container.querySelectorAll(".gg-tooltip dd")].some((value) => value.textContent !== "–"),
    ).toBe(true);

    await expect.poll(() => tool(container, "Select point").disabled).toBe(false);
    tool(container, "Select point").click();
    await expect
      .poll(() => tool(container, "Select point").getAttribute("aria-pressed"))
      .toBe("true");
    const rect = capture.getBoundingClientRect();
    capture.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        clientX: rect.left + (aggregate.x / size.width) * rect.width,
        clientY: rect.top + (aggregate.y / size.height) * rect.height,
      }),
    );
    await expect.poll(() => selections.length).toBe(1);
    expect(new Set(selections[0].keys)).toEqual(new Set(inspections.at(-1)!.focus.sourceKeys));
  });

  it("resets tooltip hover ownership when Close removes the hovered tooltip", async () => {
    let model: RenderModel | null = null;
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: { contentMode: "interactive" },
      onrender: (next: RenderModel) => (model = next),
      ...size,
    });
    const capture = container.querySelector(".gg-capture")!;
    const seed = model!.candidates.candidate(0)!;
    pointEvent(capture, "pointermove", seed.x, seed.y);
    await nextFrame();
    const firstTooltip = container.querySelector(".gg-tooltip")!;
    firstTooltip.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    capture.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect.poll(() => container.querySelector(".gg-tooltip button")).not.toBeNull();
    container.querySelector<HTMLButtonElement>(".gg-tooltip button")!.click();
    await expect.poll(() => container.querySelector(".gg-tooltip")).toBeNull();

    pointEvent(capture, "pointermove", seed.x, seed.y);
    await nextFrame();
    expect(container.querySelector(".gg-tooltip")).not.toBeNull();
    capture.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    await nextFrame();
    expect(container.querySelector(".gg-tooltip")).toBeNull();
  });

  it("reveals the latest hovered target when a pinned tooltip is unpinned", async () => {
    let model: RenderModel | null = null;
    const changes: Array<{
      state: string;
      focus: { key: PropertyKey | null };
    }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: true,
      onrender: (next: RenderModel) => (model = next),
      oninspect: (event: {
        phase: string;
        state?: string;
        focus?: { key: PropertyKey | null };
      }) => {
        if (event.phase === "change" && event.state !== undefined && event.focus !== undefined)
          changes.push({ state: event.state, focus: event.focus });
      },
      ...size,
    });
    const capture = container.querySelector(".gg-capture")!;
    const first = model!.candidates.candidate(0)!;
    const second = model!.candidates.candidate(1)!;
    pointEvent(capture, "pointermove", first.x, first.y);
    await nextFrame();
    capture.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect.poll(() => changes.at(-1)?.state).toBe("pinned");
    pointEvent(capture, "pointermove", second.x, second.y);
    await nextFrame();
    capture.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect.poll(() => changes.at(-1)?.state).toBe("transient");
    expect(changes.at(-1)?.focus.key).toBe("b");
  });

  it("disables empty area tools and exposes an accessible first-corner instruction", async () => {
    const { container } = render(GGPlot, {
      data: [],
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      inspect: true,
      select: "interval",
      zoom: true,
      ...size,
    });
    for (const label of ["Select area", "Zoom area"]) {
      const button = tool(container, label);
      expect(button.disabled).toBe(true);
      expect(Number(getComputedStyle(button).fontSize.replace("px", ""))).toBeGreaterThanOrEqual(
        14,
      );
    }

    const populated = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      select: "interval",
      ...size,
    });
    await expect.poll(() => tool(populated.container, "Select area").disabled).toBe(false);
    tool(populated.container, "Select area").click();
    await expect
      .poll(() => tool(populated.container, "Select area").getAttribute("aria-pressed"))
      .toBe("true");
    const capture = populated.container.querySelector(".gg-capture")!;
    pointEvent(capture, "pointerdown", 120, 100);
    pointEvent(capture, "pointerup", 120, 100);
    await expect.poll(() => populated.container.querySelector(".gg-first-corner")).not.toBeNull();
    expect(populated.container.querySelector(".gg-area-instruction")?.textContent).toContain(
      "Choose opposite corner",
    );
  });

  it("deeply freezes interval and zoom payloads and narrates touch focus", async () => {
    const selections: unknown[] = [];
    const zooms: unknown[] = [];
    let model: RenderModel | null = null;
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: true,
      select: "interval",
      zoom: true,
      onrender: (next: RenderModel) => (model = next),
      onselect: (event: unknown) => selections.push(event),
      onzoom: (event: unknown) => zooms.push(event),
      ...size,
    });
    await dragArea(container, { x: 100, y: 80 }, { x: 320, y: 240 });
    const selection = selections.at(-1) as {
      domain: object;
      pixels: object;
      keys: object;
    };
    expect(Object.isFrozen(selection)).toBe(true);
    expect(Object.isFrozen(selection.domain)).toBe(true);
    expect(Object.isFrozen(selection.pixels)).toBe(true);
    expect(Object.isFrozen(selection.keys)).toBe(true);

    await dragArea(container, { x: 120, y: 90 }, { x: 340, y: 250 }, "Zoom area");
    const zoom = zooms.at(-1) as { domains: object };
    expect(Object.isFrozen(zoom)).toBe(true);
    expect(Object.isFrozen(zoom.domains)).toBe(true);

    tool(container, "Inspect").click();
    const seed = model!.candidates.candidate(0)!;
    const capture = container.querySelector(".gg-capture")!;
    pointEvent(capture, "pointerdown", seed.x, seed.y, "touch", 31);
    pointEvent(capture, "pointerup", seed.x, seed.y, "touch", 31);
    await expect
      .poll(() => container.querySelector("[aria-live='polite']")?.textContent)
      .toContain("x 1");
    expect(container.querySelector("[aria-live='polite']")?.textContent).toContain("pinned");
  });

  it("uses the trained semantic-axis formatter for grouped y inspection", async () => {
    let model: RenderModel | null = null;
    const changes: Array<{ mode: string; axisLabel?: string }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" }],
      key: "id",
      scales: { y: { labels: ".1f" } },
      inspect: { mode: "y" },
      onrender: (next: RenderModel) => (model = next),
      oninspect: (event: { phase: string; mode?: string; axisLabel?: string }) => {
        if (event.phase === "change" && event.mode !== undefined)
          changes.push({
            mode: event.mode,
            ...(event.axisLabel !== undefined && {
              axisLabel: event.axisLabel,
            }),
          });
      },
      ...size,
    });
    const candidate = model!.candidates.candidate(0)!;
    pointEvent(container.querySelector(".gg-capture")!, "pointermove", candidate.x, candidate.y);
    await nextFrame();
    expect(changes.at(-1)).toMatchObject({ mode: "y", axisLabel: "10.0" });
    expect(container.querySelector(".gg-crosshair-axis-label-y")?.textContent).toBe("10.0");
  });

  it("stays busy and interaction-disabled at initial zero width, then becomes ready", async () => {
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      inspect: true,
      select: "interval",
      width: "container",
      height: 300,
    });
    container.style.width = "0px";
    await nextFrame();
    await nextFrame();
    const root = container.querySelector<HTMLElement>(".gg-plot-root")!;
    expect(root.dataset["ggReady"]).toBe("false");
    expect(container.querySelector("[role='toolbar']")?.getAttribute("aria-busy")).toBe("true");
    expect(
      [...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button")].every(
        (button) => button.disabled,
      ),
    ).toBe(true);

    container.style.width = "400px";
    await expect.poll(() => root.dataset["ggReady"]).toBe("true");
    expect(container.querySelector("[role='toolbar']")?.getAttribute("aria-busy")).toBe("false");
  });

  it("inverts y, log, time, and reversed continuous interval scales", async () => {
    const cases = [
      {
        data: rows,
        aes: { x: "x", y: "y" },
        scales: { y: { reverse: true } },
        select: { type: "interval" as const, mode: "y" as const },
        channel: "y" as const,
      },
      {
        data: [
          { id: "a", x: 1, y: 1 },
          { id: "b", x: 10, y: 2 },
          { id: "c", x: 100, y: 3 },
        ],
        aes: { x: "x", y: "y" },
        scales: { x: { type: "log" as const } },
        select: { type: "interval" as const, mode: "x" as const },
        channel: "x" as const,
      },
      {
        data: [
          { id: "a", when: "2026-01-01", y: 1 },
          { id: "b", when: "2026-02-01", y: 2 },
          { id: "c", when: "2026-03-01", y: 3 },
        ],
        aes: { x: "when", y: "y" },
        scales: { x: { type: "time" as const } },
        select: { type: "interval" as const, mode: "x" as const },
        channel: "x" as const,
      },
    ];
    for (const value of cases) {
      const ends: Array<{
        domain: { x?: [unknown, unknown]; y?: [unknown, unknown] };
      }> = [];
      const view = render(GGPlot, {
        data: value.data,
        aes: value.aes,
        layers: [{ geom: "point" }],
        key: "id",
        scales: value.scales,
        select: value.select,
        onselect: (event: {
          phase: string;
          domain: { x?: [unknown, unknown]; y?: [unknown, unknown] };
        }) => {
          if (event.phase === "end") ends.push(event);
        },
        ...size,
      });
      await dragArea(view.container, { x: 120, y: 80 }, { x: 360, y: 250 });
      await expect.poll(() => ends.length).toBe(1);
      const domain = ends[0].domain[value.channel];
      expect(domain).toHaveLength(2);
      if (domain === undefined) throw new Error(`missing ${value.channel} domain`);
      expect(Number(domain[0])).toBeLessThan(Number(domain[1]));
      expect(ends[0].domain[value.channel === "x" ? "y" : "x"]).toBeUndefined();
      view.unmount();
    }
  });

  it("keeps semantic interval modes and domain inversion correct under coord flip", async () => {
    let model: RenderModel | null = null;
    const ends: Array<{
      domain: { x?: [number, number]; y?: [number, number] };
      keys: readonly PropertyKey[];
    }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      coord: "flip",
      key: "id",
      select: { type: "interval", mode: "x" },
      onrender: (next: RenderModel) => (model = next),
      onselect: (event: {
        phase: string;
        domain: { x?: [number, number]; y?: [number, number] };
        keys: readonly PropertyKey[];
      }) => {
        if (event.phase === "end") ends.push(event);
      },
      ...size,
    });
    const rendered = model as RenderModel | null;
    if (rendered === null) throw new Error("expected a rendered flip model");
    const panel = rendered.scene.panels[0];
    await dragArea(
      container,
      { x: panel.x + panel.width * 0.1, y: panel.y + panel.height * 0.25 },
      { x: panel.x + panel.width * 0.2, y: panel.y + panel.height * 0.75 },
    );
    await expect.poll(() => ends.length).toBe(1);
    expect(ends[0].domain.y).toBeUndefined();
    const selected = ends[0].domain.x;
    const full = rendered.scales.x.domain as [number, number];
    expect(selected[1] - selected[0]).toBeLessThan(full[1] - full[0]);
    expect(ends[0].keys.length).toBeGreaterThan(0);
  });

  it.each(["x", "y"] as const)(
    "flips the %s dominant-axis crosshair and edge label with coord flip",
    async (mode) => {
      const { container } = render(GGPlot, {
        data: rows,
        aes: { x: "x", y: "y" },
        layers: [{ geom: "point" }],
        coord: "flip",
        inspect: { mode },
        ...size,
      });
      const surface = container.querySelector<HTMLElement>(".gg-capture")!;
      surface.focus();
      surface.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      await expect.poll(() => container.querySelector(".gg-crosshair")).not.toBeNull();
      const line = container.querySelector<SVGLineElement>(".gg-crosshair")!;
      if (mode === "x") {
        expect(line.getAttribute("y1")).toBe(line.getAttribute("y2"));
        expect(line.getAttribute("x1")).not.toBe(line.getAttribute("x2"));
      } else {
        expect(line.getAttribute("x1")).toBe(line.getAttribute("x2"));
        expect(line.getAttribute("y1")).not.toBe(line.getAttribute("y2"));
      }
      expect(container.querySelector(`.gg-crosshair-axis-label-${mode}`)).not.toBeNull();
    },
  );

  it("cancels queued inspection on model replacement and never resolves a stale candidate epoch", async () => {
    let model: RenderModel | null = null;
    const changes: unknown[] = [];
    const view = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: true,
      onrender: (next: RenderModel) => (model = next),
      oninspect: (event: { phase: string }) => {
        if (event.phase === "change") changes.push(event);
      },
      ...size,
    });
    const staleModel = model!;
    const candidate = staleModel.candidates.candidate(0)!;
    pointEvent(
      view.container.querySelector(".gg-capture")!,
      "pointermove",
      candidate.x,
      candidate.y,
    );
    await view.rerender(
      fromPartial({
        data: [
          { id: "new-a", x: 100, y: 1 },
          { id: "new-b", x: 200, y: 2 },
        ],
      }),
    );
    await expect.poll(() => model?.runId).not.toBe(staleModel.runId);
    await nextFrame();
    expect(changes).toHaveLength(0);
    expect(view.container.querySelector(".gg-tooltip")).toBeNull();
  });

  it("clears reducer ownership when a keyless pin cannot reconcile to a fresh data identity", async () => {
    let model: RenderModel | null = null;
    const view = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      inspect: true,
      onrender: (next: RenderModel) => (model = next),
      ...size,
    });
    const capture = view.container.querySelector<HTMLElement>(".gg-capture")!;
    const first = model!.candidates.candidate(0)!;
    pointEvent(capture, "pointermove", first.x, first.y);
    await nextFrame();
    capture.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect
      .poll(() =>
        view.container.querySelector(".gg-tooltip")?.classList.contains("gg-tooltip-pinned"),
      )
      .toBe(true);

    await view.rerender(fromPartial({ data: rows.map((row) => ({ ...row })) }));
    await expect.poll(() => view.container.querySelector(".gg-tooltip")).toBeNull();
    const second = model!.candidates.candidate(1)!;
    pointEvent(capture, "pointermove", second.x, second.y);
    await nextFrame();
    expect(view.container.querySelector(".gg-tooltip")).not.toBeNull();
  });

  it("keeps SVG/canvas inspection semantics equal and honors mixed horizontal-rule auto mode", async () => {
    const inspect = async (renderBackend: "svg" | "canvas") => {
      let model: RenderModel | null = null;
      const changes: Array<{
        mode: string;
        focus: { key: PropertyKey | null };
      }> = [];
      const view = render(GGPlot, {
        data: rows,
        aes: { x: "x", y: "y" },
        layers: [{ geom: "point", render: renderBackend }],
        key: "id",
        inspect: true,
        onrender: (next: RenderModel) => (model = next),
        oninspect: (event: {
          phase: string;
          mode?: string;
          focus?: { key: PropertyKey | null };
        }) => {
          if (event.phase === "change" && event.mode !== undefined && event.focus !== undefined)
            changes.push({ mode: event.mode, focus: event.focus });
        },
        ...size,
      });
      const seed = model!.candidates.candidate(1)!;
      pointEvent(view.container.querySelector(".gg-capture")!, "pointermove", seed.x, seed.y);
      await nextFrame();
      const result = changes.at(-1)!;
      view.unmount();
      return result;
    };
    expect(await inspect("canvas")).toEqual(await inspect("svg"));

    let mixedModel: RenderModel | null = null;
    const modes: string[] = [];
    const mixed = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }, { geom: "rule", params: { yintercept: 17 } }],
      key: "id",
      inspect: true,
      onrender: (next: RenderModel) => (mixedModel = next),
      oninspect: (event: { phase: string; mode?: string }) => {
        if (event.phase === "change" && event.mode !== undefined) modes.push(event.mode);
      },
      ...size,
    });
    const horizontalRule = Array.from({ length: mixedModel!.candidates.size }, (_, id) =>
      mixedModel!.candidates.candidate(id),
    ).find((candidate) => candidate?.layerIndex === 1)!;
    expect(horizontalRule.autoMode).toBe("y");
    pointEvent(
      mixed.container.querySelector(".gg-capture")!,
      "pointermove",
      horizontalRule.x,
      horizontalRule.y,
    );
    await nextFrame();
    expect(modes.at(-1)).toBe("y");
  });

  it("maps inspection through a CSS transform without overflowing the chart", async () => {
    let model: RenderModel | null = null;
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: true,
      onrender: (next: RenderModel) => (model = next),
      ...size,
    });
    const root = container.querySelector<HTMLElement>(".gg-plot-root")!;
    root.style.transform = "scale(0.75)";
    root.style.transformOrigin = "top left";
    const seed = model!.candidates.candidate(2)!;
    pointEvent(container.querySelector(".gg-capture")!, "pointermove", seed.x, seed.y);
    await expect
      .poll(() => {
        const tooltip = container.querySelector<HTMLElement>(".gg-tooltip");
        if (tooltip === null) return false;
        const rootRect = root.getBoundingClientRect();
        const tipRect = tooltip.getBoundingClientRect();
        return (
          tipRect.left >= rootRect.left &&
          tipRect.right <= rootRect.right + 1 &&
          tipRect.bottom <= rootRect.bottom + 1
        );
      })
      .toBe(true);
  });

  it("measures and clamps long custom floating tooltips at every transformed plot edge", async () => {
    const { container } = render(LongTooltipPlot);
    const root = container.querySelector<HTMLElement>(".gg-plot-root")!;
    root.style.transform = "scale(0.75)";
    root.style.transformOrigin = "top left";
    const candidates = JSON.parse(
      container.querySelector("[data-candidates]")!.textContent ?? "[]",
    ) as Array<{ x: number; y: number }>;
    expect(candidates).toHaveLength(5);
    const capture = container.querySelector(".gg-capture")!;
    for (const candidate of candidates) {
      pointEvent(capture, "pointermove", candidate.x, candidate.y);
      await expect
        .poll(() => {
          const tooltip = container.querySelector<HTMLElement>(".gg-tooltip");
          if (tooltip === null) return false;
          const rootRect = root.getBoundingClientRect();
          const tooltipRect = tooltip.getBoundingClientRect();
          return (
            tooltipRect.left >= rootRect.left &&
            tooltipRect.top >= rootRect.top &&
            tooltipRect.right <= rootRect.right + 1 &&
            tooltipRect.bottom <= rootRect.bottom + 1
          );
        })
        .toBe(true);
      const tooltip = container.querySelector<HTMLElement>(".gg-tooltip")!;
      const rootRect = root.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      expect(tooltipRect.left).toBeGreaterThanOrEqual(rootRect.left);
      expect(tooltipRect.top).toBeGreaterThanOrEqual(rootRect.top);
      expect(tooltipRect.right).toBeLessThanOrEqual(rootRect.right + 1);
      expect(tooltipRect.bottom).toBeLessThanOrEqual(rootRect.bottom + 1);
      expect(tooltip.scrollWidth).toBeLessThanOrEqual(tooltip.clientWidth + 2);
    }
  });

  it("updates the natural baseline after data replacement while zoomed and visible Reset returns to it", async () => {
    let model: RenderModel | null = null;
    const view = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      inspect: true,
      zoom: { mode: "x" },
      onrender: (next: RenderModel) => (model = next),
      ...size,
    });
    const before = model!;
    await dragArea(
      view.container,
      { x: before.scene.panels[0].x + before.scene.panels[0].width / 2, y: 80 },
      { x: before.scene.panels[0].x + before.scene.panels[0].width, y: 250 },
      "Zoom area",
    );
    await expect.poll(() => model?.runId).not.toBe(before.runId);
    const zoomed = model!;
    const replacement = [
      { id: "n1", x: 100, y: 1 },
      { id: "n2", x: 200, y: 2 },
      { id: "n3", x: 400, y: 3 },
    ];
    await view.rerender(fromPartial({ data: replacement }));
    await expect.poll(() => model?.runId).not.toBe(zoomed.runId);
    expect(model!.domains.baseline.x.at(-1)).toBeGreaterThanOrEqual(400);
    const reset = tool(view.container, "Reset zoom");
    expect(reset.getBoundingClientRect().width).toBeGreaterThan(0);
    reset.click();
    await expect.poll(() => model!.domains.effective.x.at(-1)).toBeGreaterThanOrEqual(400);
    expect(model!.domains.effective.x).toEqual(model!.domains.baseline.x);
  });

  it("exposes partial programmatic setZoom without clearing the other channel", async () => {
    const { container } = render(ProgrammaticZoomPlot);
    container.querySelector<HTMLButtonElement>("[data-zoom-x]")!.click();
    await expect
      .poll(() => container.querySelector("[data-x-domain]")?.textContent)
      .toBe("1.5,2.5");
    const yBefore = container.querySelector("[data-y-domain]")?.textContent;
    container.querySelector<HTMLButtonElement>("[data-zoom-y]")!.click();
    await expect.poll(() => container.querySelector("[data-y-domain]")?.textContent).toBe("12,18");
    expect(container.querySelector("[data-x-domain]")?.textContent).toBe("1.5,2.5");
    expect(yBefore).not.toBe("12,18");
  });

  it("keeps the dense pinned dialog axe-clean, focusable, scrollable, and updatable", async () => {
    const data = Array.from({ length: 1_000 }, (_, index) => ({
      id: `row-${index}`,
      x: 1,
      y: index + 1,
      group: `g-${index}`,
    }));
    let model: RenderModel | null = null;
    const view = render(GGPlot, {
      data,
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: { mode: "x", contentMode: "interactive" },
      onrender: (next: RenderModel) => (model = next),
      ...size,
    });
    const surface = view.container.querySelector<HTMLElement>(".gg-capture")!;
    const seed = model!.candidates.candidate(0)!;
    pointEvent(surface, "pointermove", seed.x, seed.y);
    await nextFrame();
    surface.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect.poll(() => view.container.querySelectorAll(".gg-tooltip dl").length).toBe(1_000);
    const tooltip = view.container.querySelector<HTMLElement>(".gg-tooltip")!;
    expect(["auto", "scroll"]).toContain(getComputedStyle(tooltip).overflowY);
    const close = tooltip.querySelector<HTMLButtonElement>("button")!;
    close.focus();
    expect(document.activeElement).toBe(close);
    await expectAccessible(view.container);
    await view.rerender(fromPartial({ height: 360 }));
    await expect
      .poll(() => view.container.querySelector("svg.gg-plot")?.getAttribute("height"))
      .toBe("360");
    expect(view.container.querySelectorAll(".gg-tooltip dl")).toHaveLength(1_000);
  }, 90_000); // axe walks all 1,000 labelled members; pinned Linux Firefox needs ~45s.
});
