import { describe, expect, it, vi } from "vitest";

import { isAreaTool } from "../../src/lib/interaction/interaction.js";
import {
  createInteractionReducer,
  type InteractionCandidateRef,
} from "../../src/lib/interaction/reducer.js";

const candidate = (id: number): InteractionCandidateRef => ({
  epoch: 1,
  id,
  panelId: "panel:all",
  x: 10 + id,
  y: 20 + id,
});

describe("isAreaTool", () => {
  it("is true only for select-area and zoom-area", () => {
    expect(isAreaTool("select-area")).toBe(true);
    expect(isAreaTool("zoom-area")).toBe(true);
    expect(isAreaTool("inspect")).toBe(false);
    expect(isAreaTool("point")).toBe(false);
  });
});

describe("chart-local interaction reducer", () => {
  it("inspect dispatches are no-ops (inspection authority is InspectionState)", () => {
    const onChange = vi.fn();
    const reducer = createInteractionReducer({
      onChange: () => {
        onChange();
      },
    });
    reducer.dispatch({
      type: "inspect",
      candidate: candidate(1),
      source: "pointer",
    });
    expect(onChange).toHaveBeenCalledTimes(0);
    expect(reducer.state.revision).toBe(0);
  });

  it("escape cancels area and bumps epoch without inspection state", () => {
    const reducer = createInteractionReducer();
    reducer.dispatch({ type: "set-tool", tool: "select-area" });
    reducer.dispatch({
      type: "begin-area",
      point: { x: 10, y: 10 },
      panelId: "panel:all",
    });
    const epoch = reducer.state.epoch;
    reducer.dispatch({ type: "escape", source: "keyboard" });
    expect(reducer.state.area.kind).toBe("idle");
    expect(reducer.state.epoch).toBe(epoch + 1);
  });

  it("keeps Select area and Zoom area mutually exclusive", () => {
    const reducer = createInteractionReducer();
    reducer.dispatch({ type: "set-tool", tool: "select-area" });
    reducer.dispatch({
      type: "begin-area",
      point: { x: 10, y: 10 },
      panelId: "panel:all",
    });
    reducer.dispatch({ type: "move-area", point: { x: 40, y: 50 } });
    expect(reducer.state.area).toMatchObject({
      kind: "dragging",
      tool: "select-area",
    });

    reducer.dispatch({ type: "set-tool", tool: "zoom-area" });
    expect(reducer.state.area.kind).toBe("idle");
    expect(reducer.state.tool).toBe("zoom-area");
  });

  it("invalidates queued work across escape, resize, and data epochs", () => {
    const reducer = createInteractionReducer();
    const frame = reducer.frameToken();
    expect(reducer.accepts(frame)).toBe(true);
    reducer.dispatch({ type: "invalidate", reason: "resize" });
    expect(reducer.accepts(frame)).toBe(false);
    const next = reducer.frameToken();
    reducer.dispatch({ type: "escape", source: "keyboard" });
    expect(reducer.accepts(next)).toBe(false);
  });

  it("coalesces inspect frames without reducer mutation; set-tool cancels the schedule", () => {
    let frame: (() => void) | null = null;
    const seen: number[] = [];
    const reducer = createInteractionReducer({
      scheduleFrame: (callback) => {
        frame = callback;
        return 1;
      },
      cancelFrame: () => {
        frame = null;
      },
      onPointerFrame: (action) => {
        if (action.type === "inspect" && action.candidate !== null) seen.push(action.candidate.id);
      },
    });
    reducer.queuePointer({
      type: "inspect",
      candidate: candidate(1),
      source: "pointer",
    });
    reducer.queuePointer({
      type: "inspect",
      candidate: candidate(2),
      source: "pointer",
    });
    expect(seen).toHaveLength(0);
    (frame as (() => void) | null)?.();
    expect(seen).toEqual([2]);
    expect(reducer.state.revision).toBe(0);

    reducer.queuePointer({
      type: "inspect",
      candidate: candidate(3),
      source: "pointer",
    });
    reducer.dispatch({ type: "set-tool", tool: "zoom-area" });
    expect(frame).toBeNull();
    expect(seen).toEqual([2]);
  });

  it("typed cancelScheduledPointer only clears matching kind; inspect frames never dispatch", () => {
    let frame: (() => void) | null = null;
    const seen: string[] = [];
    const reducer = createInteractionReducer({
      scheduleFrame: (callback) => {
        frame = callback;
        return 1;
      },
      cancelFrame: () => {
        frame = null;
      },
      onPointerFrame: (action) => {
        seen.push(action.type);
        return true;
      },
    });

    reducer.queuePointer({ type: "move-area", point: { x: 1, y: 2 } });
    expect(frame).not.toBeNull();
    reducer.cancelScheduledPointer("inspect");
    expect(frame).not.toBeNull();
    (frame as (() => void) | null)?.();
    expect(seen).toEqual(["move-area"]);

    frame = null;
    seen.length = 0;
    reducer.queuePointer({
      type: "inspect",
      candidate: candidate(1),
      source: "pointer",
    });
    const rev = reducer.state.revision;
    (frame as (() => void) | null)?.();
    expect(seen).toEqual(["inspect"]);
    // Inspect frames never bump reducer revision.
    expect(reducer.state.revision).toBe(rev);
  });
});
