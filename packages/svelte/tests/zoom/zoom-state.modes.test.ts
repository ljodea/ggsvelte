/**
 * createPlotZoomState tests — construction, local mode, controller mode.
 * Factories own deriveds — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { withEffectRoot } from "../helpers/effect-root.svelte.js";
import {
  continuousSpec,
  createPlotInteraction,
  createPlotZoomState,
  defaultScope,
  mountZoomController,
  noController,
  noInteractionCallback,
  noZoomCallback,
  type ContinuousZoomDomains,
  type PlotInteractionScope,
  type ZoomEvent,
  xOnlyZoomConfig,
  xyZoomConfig,
} from "./zoom-state.harness.js";

describe("createPlotZoomState construction", () => {
  it("does not invoke armed later-declared getters during construction (before first flush)", () => {
    let modelCalls = 0;
    let coordFlippedCalls = 0;
    let announceCalls = 0;

    const { value: state, destroy } = withEffectRoot(() =>
      createPlotZoomState({
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        zoomConfig: xyZoomConfig,
        assembled: () => continuousSpec(),
        model: () => {
          modelCalls++;
          return null;
        },
        coordFlipped: () => {
          coordFlippedCalls++;
          return false;
        },
        onzoom: noZoomCallback,
        oninteraction: noInteractionCallback,
        announce: () => {
          announceCalls++;
        },
      }),
    );

    expect(modelCalls).toBe(0);
    expect(coordFlippedCalls).toBe(0);
    expect(announceCalls).toBe(0);
    // Deriveds are lazy on client and server at the 5.33.1 floor, so this
    // guard proves the exposed accessors reach no armed getter (reads + one
    // flush below) — the construction-read discipline. Direct (non-derived)
    // construction-time reads of armed deps would throw right here.
    expect(state.effectiveZoomDomains).toBeNull();
    expect(state.effectiveSpec).not.toBeNull();
    flushSync();
    expect(modelCalls).toBe(0);
    expect(coordFlippedCalls).toBe(0);
    expect(announceCalls).toBe(0);
    destroy();
  });
});

describe("createPlotZoomState local mode", () => {
  it("commitZoom sets local domains, emits ordered sinks; resetZoom early-returns or clears", () => {
    type Sink = "announce" | "onzoom" | "oninteraction";
    const order: Sink[] = [];
    const zoomEvents: ZoomEvent[] = [];
    const announcements: string[] = [];
    const domains: ContinuousZoomDomains = { x: [2, 8], y: [4, 16] };

    const { state, destroy } = mountZoomController({
      onzoom: () => (event) => {
        order.push("onzoom");
        zoomEvents.push(event);
      },
      oninteraction: () => (event) => {
        order.push("oninteraction");
        zoomEvents.push(event as ZoomEvent);
      },
      announce: (message) => {
        order.push("announce");
        announcements.push(message);
      },
    });

    state.commitZoom(domains, "pointer");
    flushSync();
    expect(state.effectiveZoomDomains).toEqual(domains);
    // Pin the ACTUAL buildZoomEvent literal (zoom/zoom.ts) — not a recompute.
    expect(zoomEvents[0]).toEqual({
      type: "zoom",
      phase: "end",
      source: "pointer",
      domains: { x: [2, 8], y: [4, 16] },
    });
    expect(order).toEqual(["announce", "onzoom", "oninteraction"]);
    expect(announcements).toEqual(["Zoom complete."]);

    // resetZoom WITH active domains → null-commit: full clear emission
    // (the early-return case is the second reset below, once effective is null).
    order.length = 0;
    zoomEvents.length = 0;
    announcements.length = 0;
    state.resetZoom();
    flushSync();
    expect(state.effectiveZoomDomains).toBeNull();
    expect(order).toEqual(["announce", "onzoom", "oninteraction"]);
    expect(zoomEvents[0]).toEqual({
      type: "zoom",
      phase: "clear",
      source: "programmatic",
      domains: null,
    });
    expect(announcements).toEqual(["Zoom reset."]);

    // Second reset with null domains → early return.
    order.length = 0;
    zoomEvents.length = 0;
    announcements.length = 0;
    state.resetZoom("pointer");
    flushSync();
    expect(order).toEqual([]);
    expect(zoomEvents).toEqual([]);
    expect(announcements).toEqual([]);

    destroy();
  });
});

describe("createPlotZoomState controller mode", () => {
  it("writes through setZoom; x-only mode filters shared y; no-transition skips emit", () => {
    const controller = createPlotInteraction();
    const fullScope: PlotInteractionScope = { keys: "plot", x: "x-mm", y: "y-mm" };
    const zoomEvents: ZoomEvent[] = [];
    const announcements: string[] = [];

    // Production-shaped plain getter: recompute must flow from the
    // controller's own revision tracking, not test scaffolding.
    const { state, destroy } = mountZoomController({
      interaction: () => controller,
      resolvedInteractionScope: () => fullScope,
      zoomConfig: xOnlyZoomConfig,
      onzoom: () => (event) => {
        zoomEvents.push(event);
      },
      announce: (message) => {
        announcements.push(message);
      },
    });

    expect(state.effectiveZoomDomains).toBeNull();

    // Seed BOTH channels on the shared controller via a full-scope write.
    controller.setZoom({ x: [1, 5], y: [10, 50] }, { scope: fullScope, source: "programmatic" });
    flushSync();
    // x-only mode filters shared y domains for this plot's effective bag.
    expect(state.effectiveZoomDomains).toEqual({ x: [1, 5] });
    // Shared y is still present for a full-scope reader.
    expect(controller.zoom(fullScope)).toEqual({ x: [1, 5], y: [10, 50] });

    // setZoom-style commit writes through (interaction.setZoom) with the
    // mode-filtered mutation scope — must not clobber shared y.
    zoomEvents.length = 0;
    announcements.length = 0;
    state.commitZoom({ x: [2, 8] }, "programmatic");
    flushSync();
    expect(state.effectiveZoomDomains).toEqual({ x: [2, 8] });
    expect(controller.zoom(fullScope)).toEqual({ x: [2, 8], y: [10, 50] });
    expect(zoomEvents).toHaveLength(1);
    expect(announcements).toEqual(["Zoom complete."]);

    // No-transition: committing domains the shared controller already stores
    // → transition === null early return — NO zoom event, NO announcement.
    zoomEvents.length = 0;
    announcements.length = 0;
    state.commitZoom({ x: [2, 8] }, "programmatic");
    flushSync();
    expect(zoomEvents).toEqual([]);
    expect(announcements).toEqual([]);
    expect(state.effectiveZoomDomains).toEqual({ x: [2, 8] });

    destroy();
  });
});
