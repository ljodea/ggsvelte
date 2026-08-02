import "../setup-register-all.js";
/**
 * Unit tests for createPointerInspectQueue — schedule / cancel / onFrame
 * routing without mounting GGPlot.
 */
import { describe, expect, it, vi } from "vitest";

import type { CandidateFacts } from "@ggsvelte/core";
import { runPipeline } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

import { createPointerInspectQueue } from "../../src/lib/inspection/pointer-inspect.js";
import type {
  InteractionAction,
  InteractionFrameToken,
} from "../../src/lib/interaction/reducer.js";
import type { InteractionSource } from "../../src/lib/interaction/interaction.js";

function token(epoch: number): InteractionFrameToken {
  return { epoch, revision: 0 };
}

type QueuedInspect = Extract<InteractionAction, { type: "inspect" }>;

function noopCancel(): void {
  // void stub for cancelScheduledPointer
}

function makeReducer(options: {
  frameToken?: () => InteractionFrameToken;
  accepts?: () => boolean;
  queuePointer?: (
    action: QueuedInspect | Extract<InteractionAction, { type: "move-area" }>,
  ) => void;
  cancelScheduledPointer?: (kind?: "inspect" | "move-area") => void;
}) {
  return {
    frameToken: options.frameToken ?? (() => token(0)),
    accepts: options.accepts ?? (() => true),
    queuePointer: options.queuePointer ?? noopCancel,
    cancelScheduledPointer: options.cancelScheduledPointer ?? noopCancel,
  };
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
    const queued: QueuedInspect[] = [];
    const frameToken = vi.fn(() => token(1));
    const queue = createPointerInspectQueue({
      model: () => null,
      reducer: () =>
        makeReducer({
          frameToken,
          queuePointer: (action) => {
            if (action.type === "inspect") queued.push(action);
          },
        }),
      inspectionState: () => "none",
      setInspection: noopCancel,
    });
    queue.schedule({
      point: { x: 0, y: 0 },
      source: "pointer",
      mode: "auto",
      maxDistance: 24,
    });
    expect(frameToken).toHaveBeenCalledOnce();
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({
      type: "inspect",
      candidate: null,
      source: "pointer",
    });
  });

  it("clears the queue when reducer.queuePointer throws", () => {
    const seed = model.candidates.candidate(0)!;
    const queue = createPointerInspectQueue({
      model: () => model,
      reducer: () =>
        makeReducer({
          frameToken: () => token(2),
          queuePointer: () => {
            throw new Error("schedule failed");
          },
        }),
      inspectionState: () => "none",
      setInspection: noopCancel,
    });
    expect(() => {
      queue.schedule({
        point: { x: seed.x, y: seed.y },
        source: "pointer",
        mode: "auto",
        maxDistance: 48,
      });
    }).toThrow(/schedule failed/);
    // No orphan pending after throw.
    expect(queue.peekPendingPinned()).toBeNull();
    expect(queue.onFrame({ type: "inspect", candidate: null, source: "pointer" })).toBe(true);
  });

  it("routes onFrame drop/stash/apply and pending-pin take/clear", () => {
    let accepts = true;
    let inspectCalls = 0;
    const setInspection = (
      _candidate: CandidateFacts | null,
      _source: InteractionSource,
      _state?: "transient" | "pinned",
      _concreteMode?: "exact" | "x" | "y" | "xy",
    ): void => {
      inspectCalls += 1;
    };
    const queue = createPointerInspectQueue({
      model: () => model,
      reducer: () =>
        makeReducer({
          frameToken: () => token(3),
          accepts: () => accepts,
        }),
      inspectionState: () => "none",
      setInspection,
    });

    // Empty frame → none (true).
    expect(queue.onFrame({ type: "inspect", candidate: null, source: "pointer" })).toBe(true);

    const seed = model.candidates.candidate(0)!;
    const seedRef = {
      epoch: model.runId,
      id: seed.id,
      panelId: seed.panelId,
      x: seed.x,
      y: seed.y,
    };
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
        candidate: seedRef,
        source: "touch",
      }),
    ).toBe(false);

    // Schedule again under pinned host → stash-pending.
    accepts = true;
    let hostState: "none" | "transient" | "pinned" = "pinned";
    const stashing = createPointerInspectQueue({
      model: () => model,
      reducer: () => makeReducer({ frameToken: () => token(4) }),
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
        candidate: seedRef,
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
      reducer: () => makeReducer({ frameToken: () => token(5) }),
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
        candidate: seedRef,
        source: "keyboard",
      }),
    ).toBe(true);
    expect(inspectCalls).toBeGreaterThan(0);

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
      candidate: seedRef,
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
    const queued: QueuedInspect[] = [];
    const queue = createPointerInspectQueue({
      model: () => model,
      reducer: () =>
        makeReducer({
          frameToken: () => token(6),
          queuePointer: (action) => {
            if (action.type === "inspect") queued.push(action);
          },
        }),
      inspectionState: () => "none",
      setInspection: noopCancel,
    });
    queue.schedule({
      point: { x: -9999, y: -9999 },
      source: "pointer",
      mode: "exact",
      maxDistance: 1,
    });
    expect(hitTest).toHaveBeenCalled();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.candidate?.id).toBe(seed.id);
    hitTest.mockRestore();
  });
});
