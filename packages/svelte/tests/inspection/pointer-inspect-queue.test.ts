/**
 * Unit tests for createPointerInspectQueue — schedule / cancel / onFrame
 * routing without mounting GGPlot.
 */
import { describe, expect, it, vi } from "vitest";

import { runPipeline } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

import { createPointerInspectQueue } from "../../src/lib/inspection/pointer-inspect.js";
import type { InteractionFrameToken } from "../../src/lib/interaction/reducer.js";

function token(epoch: number): InteractionFrameToken {
  return { epoch, revision: 0 };
}

describe("createPointerInspectQueue", () => {
  const model = runPipeline(
    gg(
      [
        { id: "a", x: 1, y: 2 },
        { id: "b", x: 10, y: 20 },
      ],
      aes({ x: "x", y: "y" }),
    )
      .geomPoint()
      .spec(),
    { width: 320, height: 240 },
  );

  it("schedules inspect with a null model and still queues a frame", () => {
    const queuePointer = vi.fn();
    const frameToken = vi.fn(() => token(1));
    const queue = createPointerInspectQueue({
      model: () => null,
      reducer: () => ({
        frameToken,
        accepts: () => true,
        queuePointer,
        cancelScheduledPointer: vi.fn(),
      }),
      inspectionState: () => "none",
      setInspection: vi.fn(),
    });
    queue.schedule({
      point: { x: 0, y: 0 },
      source: "pointer",
      mode: "auto",
      maxDistance: 24,
    });
    expect(frameToken).toHaveBeenCalledOnce();
    expect(queuePointer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "inspect",
        candidate: null,
        source: "pointer",
      }),
    );
  });

  it("clears the queue when reducer.queuePointer throws", () => {
    const cancelScheduledPointer = vi.fn();
    const queue = createPointerInspectQueue({
      model: () => model,
      reducer: () => ({
        frameToken: () => token(2),
        accepts: () => true,
        queuePointer: () => {
          throw new Error("schedule failed");
        },
        cancelScheduledPointer,
      }),
      inspectionState: () => "none",
      setInspection: vi.fn(),
    });
    expect(() =>
      queue.schedule({
        point: { x: model.candidates.candidate(0)!.x, y: model.candidates.candidate(0)!.y },
        source: "pointer",
        mode: "auto",
        maxDistance: 48,
      }),
    ).toThrow(/schedule failed/);
    // No orphan pending after throw.
    expect(queue.peekPendingPinned()).toBeNull();
    expect(queue.onFrame({ type: "inspect", candidate: null, source: "pointer" })).toBe(true);
  });

  it("routes onFrame drop/stash/apply and pending-pin take/clear", () => {
    let accepts = true;
    const setInspection = vi.fn();
    const cancelScheduledPointer = vi.fn();
    const queue = createPointerInspectQueue({
      model: () => model,
      reducer: () => ({
        frameToken: () => token(3),
        accepts: () => accepts,
        queuePointer: vi.fn(),
        cancelScheduledPointer,
      }),
      inspectionState: () => "none",
      setInspection,
    });

    // Empty frame → none (true).
    expect(queue.onFrame({ type: "inspect", candidate: null, source: "pointer" })).toBe(true);

    const seed = model.candidates.candidate(0)!;
    queue.schedule({
      point: { x: seed.x, y: seed.y },
      source: "touch",
      mode: "exact",
      maxDistance: 24,
    });
    // Stale token → drop (false).
    accepts = false;
    expect(
      queue.onFrame({
        type: "inspect",
        candidate: { epoch: model.runId, id: seed.id, panelId: seed.panelId, x: seed.x, y: seed.y },
        source: "touch",
      }),
    ).toBe(false);

    // Schedule again; pin host state → stash-pending.
    accepts = true;
    queue.schedule({
      point: { x: seed.x, y: seed.y },
      source: "pointer",
      mode: "exact",
      maxDistance: 24,
    });
    // Swap inspectionState via a mutable box.
    let hostState: "none" | "transient" | "pinned" = "pinned";
    const stashing = createPointerInspectQueue({
      model: () => model,
      reducer: () => ({
        frameToken: () => token(4),
        accepts: () => true,
        queuePointer: vi.fn(),
        cancelScheduledPointer,
      }),
      inspectionState: () => hostState,
      setInspection,
    });
    stashing.schedule({
      point: { x: seed.x, y: seed.y },
      source: "pointer",
      mode: "exact",
      maxDistance: 24,
    });
    expect(
      stashing.onFrame({
        type: "inspect",
        candidate: { epoch: model.runId, id: seed.id, panelId: seed.panelId, x: seed.x, y: seed.y },
        source: "pointer",
      }),
    ).toBe(true);
    expect(stashing.peekPendingPinned()).not.toBeNull();
    const taken = stashing.takePendingPinned();
    expect(taken).not.toBeNull();
    expect(stashing.peekPendingPinned()).toBeNull();
    expect(stashing.takePendingPinned()).toBeNull();

    // apply-pending while host is transient.
    hostState = "transient";
    const applying = createPointerInspectQueue({
      model: () => model,
      reducer: () => ({
        frameToken: () => token(5),
        accepts: () => true,
        queuePointer: vi.fn(),
        cancelScheduledPointer,
      }),
      inspectionState: () => hostState,
      setInspection,
    });
    applying.schedule({
      point: { x: seed.x, y: seed.y },
      source: "keyboard",
      mode: "exact",
      maxDistance: 24,
    });
    expect(
      applying.onFrame({
        type: "inspect",
        candidate: { epoch: model.runId, id: seed.id, panelId: seed.panelId, x: seed.x, y: seed.y },
        source: "keyboard",
      }),
    ).toBe(true);
    expect(setInspection).toHaveBeenCalled();

    // cancel discard vs preserve pendingPinned, then scene invalidate.
    applying.schedule({
      point: { x: seed.x, y: seed.y },
      source: "pointer",
      mode: "exact",
      maxDistance: 24,
    });
    hostState = "pinned";
    applying.onFrame({
      type: "inspect",
      candidate: { epoch: model.runId, id: seed.id, panelId: seed.panelId, x: seed.x, y: seed.y },
      source: "pointer",
    });
    expect(applying.peekPendingPinned()).not.toBeNull();
    applying.cancel({ pendingPinned: "preserve" });
    expect(applying.peekPendingPinned()).not.toBeNull();
    applying.cancel({ pendingPinned: "discard" });
    expect(applying.peekPendingPinned()).toBeNull();
    applying.schedule({
      point: { x: seed.x, y: seed.y },
      source: "pointer",
      mode: "exact",
      maxDistance: 24,
    });
    applying.clearForSceneInvalidate();
    expect(applying.peekPendingPinned()).toBeNull();
    expect(applying.onFrame({ type: "inspect", candidate: null, source: "pointer" })).toBe(true);
  });

  it("falls back to hitTest when nearest match is null", () => {
    const seed = model.candidates.candidate(1)!;
    const hitTest = vi.spyOn(model.candidates, "hitTest").mockReturnValue(seed);
    // Point far outside any mark so nearest is null; hitTest still supplies fallback.
    const queuePointer = vi.fn();
    const queue = createPointerInspectQueue({
      model: () => model,
      reducer: () => ({
        frameToken: () => token(6),
        accepts: () => true,
        queuePointer,
        cancelScheduledPointer: vi.fn(),
      }),
      inspectionState: () => "none",
      setInspection: vi.fn(),
    });
    queue.schedule({
      point: { x: -9999, y: -9999 },
      source: "pointer",
      mode: "exact",
      maxDistance: 1,
    });
    expect(hitTest).toHaveBeenCalled();
    expect(queuePointer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "inspect",
        candidate: expect.objectContaining({ id: seed.id }),
      }),
    );
    hitTest.mockRestore();
  });
});
