/**
 * createSurfaceState brush lifecycle and selectionEvent origin-panel routing.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { BRUSH_SECOND_CORNER_ANNOUNCEMENT } from "../../src/lib/assembly/labels.js";
import {
  facetSpec,
  pointerEvent,
  panelCenterClient,
  mountSurfaceComposite,
} from "./surface-state.harness.js";

describe("createSurfaceState brush lifecycle", () => {
  it("pointerdown begin-area emits start; move grows draft via RAF; select-end commits interval", () => {
    const h = mountSurfaceComposite();
    h.surface.chooseTool("select-area");
    flushSync();
    expect(h.surface.activeTool).toBe("select-area");

    const start = panelCenterClient(h.model);
    const end = { x: start.x + 40, y: start.y + 30 };

    // Phase: pointerdown → begin-area + start event
    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, { clientX: start.x, clientY: start.y }),
    );
    flushSync();
    expect(h.surface.brushRect).not.toBeNull();
    expect(h.surface.reducer.state.area.kind).not.toBe("idle");
    expect(h.selectionEvents.map((e) => e.phase)).toEqual(["start"]);
    expect(h.interval.committedInterval).toBeNull();

    // Phase: pointermove — brush growth is RAF-mediated; durable interval does NOT update.
    h.surface.onPointerMove(
      pointerEvent("pointermove", h.capture, { clientX: end.x, clientY: end.y }),
    );
    // Before flush: draft corners are still the start corners (frame pending).
    const beforeFlush = { ...h.surface.brushRect! };
    h.flushFrames();
    flushSync();
    const afterFlush = h.surface.brushRect;
    expect(afterFlush).not.toBeNull();
    // The END corner moved to the pointer after the deferred frame — a strict
    // conjunction: a change event alone must NOT satisfy this (the draft
    // rectangle itself has to grow).
    expect(afterFlush!.x1).not.toBe(beforeFlush.x1);
    expect(afterFlush!.y1).not.toBe(beforeFlush.y1);
    expect(h.interval.committedInterval).toBeNull();
    expect(h.selectionEvents.some((e) => e.phase === "change")).toBe(true);

    // Phase: pointerup select-end → real interval controller commits + end emit
    h.surface.onPointerUp(pointerEvent("pointerup", h.capture, { clientX: end.x, clientY: end.y }));
    flushSync();
    expect(h.surface.brushRect).toBeNull();
    expect(h.interval.committedInterval).not.toBeNull();
    expect(h.interval.effectiveIntervals.length).toBeGreaterThan(0);
    const phases = h.selectionEvents.map((e) => e.phase);
    expect(phases[0]).toBe("start");
    expect(phases.at(-1)).toBe("end");
    expect(phases.includes("change")).toBe(true);
    // Load-bearing order: interval commit before host end emit (onselection
    // readers may observe committedInterval synchronously in the callback).
    const commitAt = h.selectionOrderLog.indexOf("commit");
    const emitEndAt = h.selectionOrderLog.indexOf("emit:end");
    expect(commitAt).toBeGreaterThanOrEqual(0);
    expect(emitEndAt).toBeGreaterThan(commitAt);

    h.destroy();
  });

  it("pointerup zoom-end routes through real zoom controller", () => {
    const h = mountSurfaceComposite();
    h.surface.chooseTool("zoom-area");
    flushSync();

    const start = panelCenterClient(h.model);
    const end = { x: start.x + 50, y: start.y + 40 };

    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, { clientX: start.x, clientY: start.y }),
    );
    flushSync();
    h.surface.onPointerMove(
      pointerEvent("pointermove", h.capture, { clientX: end.x, clientY: end.y }),
    );
    h.flushFrames();
    flushSync();
    h.surface.onPointerUp(pointerEvent("pointerup", h.capture, { clientX: end.x, clientY: end.y }));
    flushSync();

    expect(h.surface.brushRect).toBeNull();
    expect(h.zoom.effectiveZoomDomains).not.toBeNull();
    h.destroy();
  });

  it("too-small pointer finish takes keep-second-corner: draft + area retained, announcement, no end", () => {
    const h = mountSurfaceComposite();
    h.surface.chooseTool("select-area");
    flushSync();

    const start = panelCenterClient(h.model);
    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, { clientX: start.x, clientY: start.y }),
    );
    flushSync();
    h.announcements.length = 0;
    const eventsBefore = h.selectionEvents.length;

    // 1px away is below the too-small threshold for every tool.
    h.surface.onPointerUp(
      pointerEvent("pointerup", h.capture, { clientX: start.x + 1, clientY: start.y + 1 }),
    );
    flushSync();

    // keep-second-corner: the draft and reducer area SURVIVE, the exact
    // second-corner announcement fires, and neither an end event nor a
    // durable interval commit happens.
    expect(h.surface.brushRect).not.toBeNull();
    expect(h.surface.reducer.state.area.kind).not.toBe("idle");
    expect(h.announcements).toContain(BRUSH_SECOND_CORNER_ANNOUNCEMENT);
    expect(h.selectionEvents.slice(eventsBefore).every((e) => e.phase !== "end")).toBe(true);
    expect(h.interval.committedInterval).toBeNull();

    h.destroy();
  });
});

describe("createSurfaceState selectionEvent origin panel", () => {
  it("idle uses committedInterval panel; active area uses reducer area panel", () => {
    const h = mountSurfaceComposite({ spec: facetSpec() });
    h.surface.chooseTool("select-area");
    flushSync();

    const p0 = panelCenterClient(h.model, 0);
    const p1 = panelCenterClient(h.model, 1);
    const panel0 = h.model.scene.panels[0];
    const panel1 = h.model.scene.panels[1];
    if (panel0 === undefined || panel1 === undefined) throw new Error("expected two panels");

    // Begin on panel 0 and finish so interval commits with panel0 origin.
    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, { clientX: p0.x, clientY: p0.y }),
    );
    flushSync();
    expect(h.surface.reducer.state.area.kind).not.toBe("idle");
    if (h.surface.reducer.state.area.kind !== "idle") {
      expect(h.surface.reducer.state.area.panelId).toBe(panel0.id);
    }
    h.surface.onPointerMove(
      pointerEvent("pointermove", h.capture, {
        clientX: p0.x + 30,
        clientY: p0.y + 20,
      }),
    );
    h.flushFrames();
    flushSync();
    h.surface.onPointerUp(
      pointerEvent("pointerup", h.capture, {
        clientX: p0.x + 30,
        clientY: p0.y + 20,
      }),
    );
    flushSync();
    expect(h.interval.committedInterval?.panelId).toBe(panel0.id);

    // Start a new brush on panel 1 — active area origin is panel1.
    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, { clientX: p1.x, clientY: p1.y }),
    );
    flushSync();
    if (h.surface.reducer.state.area.kind !== "idle") {
      expect(h.surface.reducer.state.area.panelId).toBe(panel1.id);
    }
    // Start event during active area should carry panel1.
    let lastStart: (typeof h.selectionEvents)[number] | undefined;
    for (let i = h.selectionEvents.length - 1; i >= 0; i--) {
      const event = h.selectionEvents[i];
      if (event?.phase === "start") {
        lastStart = event;
        break;
      }
    }
    expect(lastStart?.panelId).toBe(panel1.id);

    h.destroy();
  });
});
