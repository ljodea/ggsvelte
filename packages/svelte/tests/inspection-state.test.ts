/**
 * Inspection controller tests (S6 extraction).
 * Factories own deriveds + effects — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";

import type { CandidateFacts, CellValue, RenderModel } from "@ggsvelte/core";
import { aes, gg, type PortableSpec } from "@ggsvelte/spec";

import type {
  PlotInspection,
  PlotInteractionEvent,
  ResolvedInteractionConfig,
} from "../src/lib/interaction.js";
import { normalizeInteractionConfig } from "../src/lib/interaction.js";
import { createInteractionReducer } from "../src/lib/interaction-reducer.js";
import {
  createInspectionState,
  type InspectionStateDeps,
} from "../src/lib/inspection-state.svelte.js";
import { hitFromCandidate } from "../src/lib/plot-pointer.js";
import type { QueuedPointerInspection } from "../src/lib/plot-surface-inspection-frame.js";
import { withEffectRoot, withFlushedEffectRoot } from "./helpers/effect-root.svelte.js";
import { modelFor } from "./helpers/model.js";
import { reactiveBox } from "./helpers/reactive-box.svelte.js";

const continuousRows = [
  { id: "a", x: 1, y: 1 },
  { id: "b", x: 10, y: 20 },
  { id: "c", x: 5, y: 8 },
];

type InspectConfig = ResolvedInteractionConfig["inspect"];
type InteractionReducer = ReturnType<typeof createInteractionReducer>;
type InspectCb = ((event: PlotInspection<Record<string, CellValue>>) => void) | undefined;
type InteractionCb = ((event: PlotInteractionEvent<Record<string, CellValue>>) => void) | undefined;

const noInspect: () => InspectCb = () => {
  /* no callback */
};
const noInteraction: () => InteractionCb = () => {
  /* no callback */
};

const defaultInspect = (): InspectConfig =>
  normalizeInteractionConfig({ inspect: { pin: true } }).inspect;

const modeXInspect = (): InspectConfig =>
  normalizeInteractionConfig({ inspect: { pin: false, mode: "x" } }).inspect;

/** Identity semantic keys — enough for local consumption without a host service. */
function keyAtForModel(model: RenderModel): (index: number) => PropertyKey | null {
  return (index) => {
    const row = model.row(index);
    if (row === null) return null;
    const id = row["id"];
    return id === undefined || id === null ? String(index) : String(id);
  };
}

function continuousSpec(
  data: readonly { id: string; x: number; y: number }[] = continuousRows,
): PortableSpec {
  return gg([...data], aes({ x: "x", y: "y" }))
    .geomPoint()
    .spec();
}

/**
 * Twelve series at the same x (color-split points) so mode "x" groups more
 * than the transient eight-member limit (matches interaction-unit fixture).
 */
function largeGroupSpec(): PortableSpec {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    id: `row-${i}`,
    x: 1,
    y: i,
    series: `series-${i}`,
  }));
  return gg(rows, aes({ x: "x", y: "y", color: "series" }))
    .geomPoint()
    .spec();
}

function firstCandidate(model: RenderModel): CandidateFacts {
  for (let id = 0; id < model.candidates.size; id++) {
    const candidate = model.candidates.candidate(id);
    if (candidate !== null) return candidate;
  }
  throw new Error("expected at least one candidate");
}

function candidateHit(model: RenderModel): {
  candidate: CandidateFacts;
  hit: ReturnType<typeof hitFromCandidate>;
} {
  const candidate = firstCandidate(model);
  return { candidate, hit: hitFromCandidate(candidate) };
}

type ConcreteMode = "exact" | "x" | "y" | "xy";

/** Apply transient/pinned inspection without threading CandidateFacts.mode (oxlint). */
function applyInspect(
  state: ReturnType<typeof createInspectionState>,
  candidate: CandidateFacts,
  source: "pointer" | "keyboard" | "touch" = "pointer",
  inspectionState: "transient" | "pinned" = "transient",
  concreteMode: ConcreteMode = "xy",
): void {
  state.setInspection(
    hitFromCandidate(candidate),
    source,
    inspectionState,
    concreteMode,
    candidate,
  );
}

type InspectionHarness = {
  state: ReturnType<typeof createInspectionState>;
  reducer: InteractionReducer;
  destroy: () => void;
};

/**
 * Mount the controller with production-shaped deps: every reactive dep is a
 * getter (mirroring InspectionStateDeps). Harness owns the component-held
 * reducer and passes a getter. Call registerInspectionEffects when effects
 * are under test.
 */
function mountInspectionController(
  options: {
    model?: () => RenderModel | null;
    reducer?: () => InteractionReducer;
    inspectConfig?: () => InspectConfig;
    surfaceInteractive?: () => boolean;
    inspectEnabled?: () => boolean;
    dataIdentityEpoch?: () => string;
    keyAt?: (index: number) => PropertyKey | null;
    root?: () => HTMLDivElement | null;
    captureSurface?: () => HTMLDivElement | null;
    plotId?: () => string;
    tooltipHovered?: () => boolean;
    clearTooltipHovered?: () => void;
    clearBrush?: () => void;
    chooseTool?: (tool: "inspect") => void;
    oninspect?: InspectionStateDeps["oninspect"];
    oninteraction?: InspectionStateDeps["oninteraction"];
    announce?: (message: string) => void;
    clearAnnouncement?: () => void;
    registerEffects?: boolean;
  } = {},
): InspectionHarness {
  const defaultModel = modelFor(continuousSpec());
  const ownedReducer =
    options.reducer === undefined
      ? createInteractionReducer({
          scheduleFrame: (callback) => {
            callback();
            return 0;
          },
          cancelFrame: () => {},
        })
      : null;
  const getReducer = options.reducer ?? (() => ownedReducer!);

  const { value: state, destroy } = withFlushedEffectRoot(() => {
    const controller = createInspectionState({
      model: options.model ?? (() => defaultModel),
      reducer: getReducer,
      inspectConfig: options.inspectConfig ?? defaultInspect,
      surfaceInteractive: options.surfaceInteractive ?? (() => true),
      inspectEnabled: options.inspectEnabled ?? (() => true),
      dataIdentityEpoch: options.dataIdentityEpoch ?? (() => "epoch-1"),
      keyAt:
        options.keyAt ??
        ((index) => {
          const model = options.model?.() ?? defaultModel;
          return keyAtForModel(model)(index);
        }),
      root: options.root ?? (() => null),
      captureSurface: options.captureSurface ?? (() => null),
      plotId: options.plotId ?? (() => "plot-test"),
      tooltipHovered: options.tooltipHovered ?? (() => false),
      clearTooltipHovered: options.clearTooltipHovered ?? (() => {}),
      clearBrush: options.clearBrush ?? (() => {}),
      chooseTool: options.chooseTool ?? (() => {}),
      oninspect: options.oninspect ?? noInspect,
      oninteraction: options.oninteraction ?? noInteraction,
      announce: options.announce ?? (() => {}),
      clearAnnouncement: options.clearAnnouncement ?? (() => {}),
    });
    if (options.registerEffects !== false) controller.registerInspectionEffects();
    return controller;
  });

  return { state, reducer: getReducer(), destroy };
}

describe("createInspectionState construction", () => {
  it("does not invoke armed later-declared getters during construction (before first flush)", () => {
    let reducerCalls = 0;
    let captureSurfaceCalls = 0;
    let tooltipHoveredCalls = 0;
    let clearTooltipHoveredCalls = 0;
    let keyAtCalls = 0;
    let inspectEnabledCalls = 0;
    let chooseToolCalls = 0;
    let clearBrushCalls = 0;
    let oninspectCalls = 0;
    let oninteractionCalls = 0;

    const constructionModel = modelFor(continuousSpec());
    const reducer = createInteractionReducer();

    const { value: state, destroy } = withEffectRoot(() =>
      createInspectionState({
        model: () => constructionModel,
        reducer: () => {
          reducerCalls++;
          return reducer;
        },
        inspectConfig: defaultInspect,
        surfaceInteractive: () => true,
        inspectEnabled: () => {
          inspectEnabledCalls++;
          return true;
        },
        dataIdentityEpoch: () => "epoch-1",
        keyAt: (index) => {
          keyAtCalls++;
          return String(index);
        },
        root: () => null,
        captureSurface: () => {
          captureSurfaceCalls++;
          return null;
        },
        plotId: () => "plot",
        tooltipHovered: () => {
          tooltipHoveredCalls++;
          return false;
        },
        clearTooltipHovered: () => {
          clearTooltipHoveredCalls++;
        },
        clearBrush: () => {
          clearBrushCalls++;
        },
        chooseTool: () => {
          chooseToolCalls++;
        },
        oninspect: () => {
          oninspectCalls++;
          return noInspect();
        },
        oninteraction: () => {
          oninteractionCalls++;
          return noInteraction();
        },
        announce: () => {},
        clearAnnouncement: () => {},
      }),
    );

    expect(reducerCalls).toBe(0);
    expect(captureSurfaceCalls).toBe(0);
    expect(tooltipHoveredCalls).toBe(0);
    expect(clearTooltipHoveredCalls).toBe(0);
    expect(keyAtCalls).toBe(0);
    expect(inspectEnabledCalls).toBe(0);
    expect(chooseToolCalls).toBe(0);
    expect(clearBrushCalls).toBe(0);
    expect(oninspectCalls).toBe(0);
    expect(oninteractionCalls).toBe(0);
    // Client-lazy: accessors + one flush must not reach armed getters.
    // SSR-eager deriveds are gated by .ssr suites and compat:consumer.
    expect(state.inspection).toBeNull();
    expect(state.inspectionPanel).toBeNull();
    flushSync();
    expect(reducerCalls).toBe(0);
    expect(captureSurfaceCalls).toBe(0);
    expect(tooltipHoveredCalls).toBe(0);
    expect(clearTooltipHoveredCalls).toBe(0);
    expect(keyAtCalls).toBe(0);
    expect(inspectEnabledCalls).toBe(0);
    expect(chooseToolCalls).toBe(0);
    expect(clearBrushCalls).toBe(0);
    expect(oninspectCalls).toBe(0);
    expect(oninteractionCalls).toBe(0);
    destroy();
  });
});

describe("createInspectionState setInspection", () => {
  it("applies a transient snapshot and gates re-emits by fingerprint", () => {
    const model = modelFor(continuousSpec());
    const events: PlotInspection<Record<string, CellValue>>[] = [];
    const { state, destroy } = mountInspectionController({
      model: () => model,
      oninspect: () => (event) => {
        events.push(event);
      },
    });

    const { candidate, hit } = candidateHit(model);
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    expect(state.inspection).not.toBeNull();
    expect(state.inspection?.state).toBe("transient");
    expect(state.inspection?.phase).toBe("change");
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("change");

    // Same fingerprint → skip emit.
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    expect(events).toHaveLength(1);

    // Clear emits once.
    state.setInspection(null, "pointer");
    flushSync();
    expect(state.inspection).toBeNull();
    expect(events).toHaveLength(2);
    expect(events[1]?.phase).toBe("clear");

    destroy();
  });

  it("dispatches inspect-null twice on clear (load-bearing dual dispatch)", () => {
    const model = modelFor(continuousSpec());
    const base = createInteractionReducer();
    const dispatches: unknown[] = [];
    const wrapped: InteractionReducer = {
      ...base,
      dispatch: (action) => {
        dispatches.push(action);
        base.dispatch(action);
      },
      get state() {
        return base.state;
      },
    };

    const { state, destroy } = mountInspectionController({
      model: () => model,
      reducer: () => wrapped,
      registerEffects: false,
    });

    const { candidate, hit } = candidateHit(model);
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    dispatches.length = 0;

    state.setInspection(null, "pointer");
    flushSync();
    const inspectNulls = dispatches.filter(
      (action) =>
        typeof action === "object" &&
        action !== null &&
        "type" in action &&
        action.type === "inspect" &&
        "candidate" in action &&
        action.candidate === null,
    );
    expect(inspectNulls).toHaveLength(2);

    destroy();
  });
});

describe("createInspectionState pin cycle", () => {
  it("transient → pin flip → unpin announcement + release", () => {
    const model = modelFor(continuousSpec());
    const announcements: string[] = [];
    const { state, destroy } = mountInspectionController({
      model: () => model,
      announce: (message) => {
        announcements.push(message);
      },
    });

    const { candidate, hit } = candidateHit(model);
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    expect(state.inspection?.state).toBe("transient");

    state.toggleInspectionPin("keyboard");
    flushSync();
    expect(state.inspection?.state).toBe("pinned");

    state.toggleInspectionPin("keyboard");
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    expect(announcements.some((message) => message.includes("unpinned"))).toBe(true);

    destroy();
  });

  it("restore-pending path via stashed queued frame while pinned", () => {
    const model = modelFor(continuousSpec());
    const { state, reducer, destroy } = mountInspectionController({
      model: () => model,
      registerEffects: false,
    });

    const first = candidateHit(model);
    state.setInspection(first.hit, "pointer", "transient", "xy", first.candidate);
    flushSync();
    state.toggleInspectionPin("pointer");
    flushSync();
    expect(state.inspection?.state).toBe("pinned");

    // Second candidate as pending restore payload.
    let second: CandidateFacts | null = null;
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      if (candidate !== null && candidate.id !== first.candidate.id) {
        second = candidate;
        break;
      }
    }
    if (second === null) throw new Error("expected a second candidate");
    const pending: QueuedPointerInspection = {
      hit: hitFromCandidate(second),
      source: "pointer",
      concreteMode: "xy",
      candidate: second,
    };
    state.queuePointerFrame(pending, reducer.frameToken());
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: {
        epoch: model.runId,
        id: second.id,
        panelId: second.panelId,
        x: second.x,
        y: second.y,
      },
      source: "pointer",
    });
    flushSync();
    // Still pinned — pending was stashed, not applied.
    expect(state.inspection?.state).toBe("pinned");

    state.toggleInspectionPin("pointer");
    flushSync();
    // restore-pending → transient on the stashed second hit.
    expect(state.inspection?.state).toBe("transient");
    expect(state.inspection?.focus.anchor).toEqual({
      x: second.x,
      y: second.y,
    });

    destroy();
  });
});

describe("createInspectionState applyQueuedInspectFrame", () => {
  it("drops stale token, stashes when pinned, applies when fresh, drops on epoch mismatch; always clears queues first", () => {
    const model = modelFor(continuousSpec());
    const { state, reducer, destroy } = mountInspectionController({
      model: () => model,
      registerEffects: false,
    });
    const { candidate, hit } = candidateHit(model);
    const queued: QueuedPointerInspection = {
      hit,
      source: "pointer",
      concreteMode: "xy",
      candidate,
    };
    const frameCandidate = {
      epoch: model.runId,
      id: candidate.id,
      panelId: candidate.panelId,
      x: candidate.x,
      y: candidate.y,
    };

    // Empty frame path: no pending → none; queues stay empty; no inspection.
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: null,
      source: "pointer",
    });
    flushSync();
    expect(state.inspection).toBeNull();

    // Stale token → drop (queue cleared before routing).
    state.queuePointerFrame(queued, { epoch: 0, revision: 0 });
    // Advance reducer epoch so token is stale.
    reducer.dispatch({ type: "invalidate", reason: "scene" });
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: frameCandidate,
      source: "pointer",
    });
    flushSync();
    expect(state.inspection).toBeNull();
    // Second apply is empty-frame (queues stayed cleared after drop).
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: frameCandidate,
      source: "pointer",
    });
    expect(state.inspection).toBeNull();

    // Fresh token + transient → apply.
    state.queuePointerFrame(queued, reducer.frameToken());
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: frameCandidate,
      source: "pointer",
    });
    flushSync();
    expect(state.inspection).not.toBeNull();
    expect(state.inspection?.state).toBe("transient");
    // Queues cleared: re-apply is empty.
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: frameCandidate,
      source: "pointer",
    });
    flushSync();
    expect(state.inspection?.state).toBe("transient");

    // Pinned → stash-pending (not apply over pinned).
    state.toggleInspectionPin("pointer");
    flushSync();
    expect(state.inspection?.state).toBe("pinned");
    let other: CandidateFacts | null = null;
    for (let id = 0; id < model.candidates.size; id++) {
      const c = model.candidates.candidate(id);
      if (c !== null && c.id !== candidate.id) {
        other = c;
        break;
      }
    }
    if (other === null) throw new Error("expected another candidate");
    const otherQueued: QueuedPointerInspection = {
      hit: hitFromCandidate(other),
      source: "pointer",
      concreteMode: "xy",
      candidate: other,
    };
    state.queuePointerFrame(otherQueued, reducer.frameToken());
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: {
        epoch: model.runId,
        id: other.id,
        panelId: other.panelId,
        x: other.x,
        y: other.y,
      },
      source: "pointer",
    });
    flushSync();
    expect(state.inspection?.state).toBe("pinned");
    // Queues cleared after stash; second apply is empty (no double-stash).
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: {
        epoch: model.runId,
        id: other.id,
        panelId: other.panelId,
        x: other.x,
        y: other.y,
      },
      source: "pointer",
    });

    // Epoch mismatch → drop (after unpin for a clean transient base).
    state.toggleInspectionPin("pointer");
    flushSync();
    state.setInspection(null, "pointer");
    flushSync();
    state.queuePointerFrame(queued, reducer.frameToken());
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: { ...frameCandidate, epoch: model.runId + 999 },
      source: "pointer",
    });
    flushSync();
    expect(state.inspection).toBeNull();

    destroy();
  });
});

describe("createInspectionState scene-reconcile effect", () => {
  it("clears transient on model swap; reconciles pinned; clears when inspect disabled", () => {
    const modelA = modelFor(continuousSpec());
    const modelB = modelFor(
      continuousSpec([
        { id: "x", x: 2, y: 3 },
        { id: "y", x: 4, y: 5 },
      ]),
    );
    // Distinct runIds so reconcile advances.
    Object.defineProperty(modelA, "runId", { value: 1, configurable: true });
    Object.defineProperty(modelB, "runId", { value: 2, configurable: true });

    const modelBox = reactiveBox<RenderModel | null>(modelA);
    const enabledBox = reactiveBox(true);
    const events: PlotInspection<Record<string, CellValue>>[] = [];

    const { state, destroy } = mountInspectionController({
      model: () => modelBox.value,
      inspectEnabled: () => enabledBox.value,
      oninspect: () => (event) => {
        events.push(event);
      },
      registerEffects: true,
    });

    const { candidate, hit } = candidateHit(modelA);
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    events.length = 0;

    // Model swap → invalidate-clear-transient.
    modelBox.set(modelB);
    flushSync();
    expect(state.inspection).toBeNull();

    // Pin on modelB, swap back → reconcile-pinned (or clear if seed gone).
    const b = candidateHit(modelB);
    applyInspect(state, b.candidate);
    flushSync();
    state.toggleInspectionPin("pointer");
    flushSync();
    expect(state.inspection?.state).toBe("pinned");
    events.length = 0;
    Object.defineProperty(modelA, "runId", { value: 3, configurable: true });
    modelBox.set(modelA);
    flushSync();
    // Identity may fail across unrelated models → clear emit OR snapshot swap.
    // Either path must not leave a dangling transient on the old model.
    if (state.inspection === null) {
      expect(events.some((event) => event.phase === "clear")).toBe(true);
      const again = candidateHit(modelA);
      applyInspect(state, again.candidate);
      flushSync();
    } else {
      expect(state.inspection.state).toBe("pinned");
    }

    // Disable inspect → clear-disabled.
    enabledBox.set(false);
    flushSync();
    expect(state.inspection).toBeNull();

    destroy();
  });
});

describe("createInspectionState dismissInspection", () => {
  it("escape vs close: clears tooltip/pending, brush, chooseTool, refocus, emit-clear", async () => {
    const model = modelFor(continuousSpec());
    let tooltipHovered = true;
    let brushCleared = 0;
    let chooseToolCalls: string[] = [];
    const capture = document.createElement("div");
    const focusSpy = vi.spyOn(capture, "focus");
    const events: PlotInspection<Record<string, CellValue>>[] = [];

    const { state, destroy } = mountInspectionController({
      model: () => model,
      tooltipHovered: () => tooltipHovered,
      clearTooltipHovered: () => {
        tooltipHovered = false;
      },
      clearBrush: () => {
        brushCleared++;
      },
      chooseTool: (tool) => {
        chooseToolCalls.push(tool);
      },
      captureSurface: () => capture,
      oninspect: () => (event) => {
        events.push(event);
      },
      registerEffects: false,
    });

    const { candidate, hit } = candidateHit(model);
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    events.length = 0;

    state.dismissInspection("escape", "keyboard", { returnToInspect: true });
    flushSync();
    expect(state.inspection).toBeNull();
    expect(tooltipHovered).toBe(false);
    expect(brushCleared).toBeGreaterThanOrEqual(1);
    expect(chooseToolCalls).toContain("inspect");
    expect(events.some((event) => event.phase === "clear")).toBe(true);

    // close with restoreFocus schedules captureSurface focus.
    tooltipHovered = true;
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    events.length = 0;
    state.closeInspection("pointer", true);
    flushSync();
    expect(state.inspection).toBeNull();
    await Promise.resolve();
    expect(focusSpy).toHaveBeenCalled();

    destroy();
  });
});

describe("createInspectionState traversal", () => {
  it("move-by-delta wraps; reset only via resetTraversalIndex", () => {
    const model = modelFor(continuousSpec());
    const { state, destroy } = mountInspectionController({
      model: () => model,
      registerEffects: false,
    });

    // Seed traversal at index 0 via navigate from -1.
    state.navigate(1);
    flushSync();
    expect(state.inspection).not.toBeNull();
    const firstAnchor = state.inspection!.focus.anchor;

    state.navigate(1);
    flushSync();
    const secondAnchor = state.inspection!.focus.anchor;
    // With 3 points, delta advances focus.
    expect(secondAnchor).not.toEqual(firstAnchor);

    // Wrap: enough steps returns toward the set.
    state.navigate(10);
    flushSync();
    expect(state.inspection).not.toBeNull();

    state.resetTraversalIndex();
    // Reset alone does not clear inspection — only the index (blur path).
    expect(state.inspection).not.toBeNull();

    // Directional navigate requires an active inspection.
    state.navigateDirection(1, 0);
    flushSync();
    expect(state.inspection).not.toBeNull();

    destroy();
  });
});

describe("createInspectionState setInspection(null) clear ordering", () => {
  it("pins ordered sequence: dispatch1 → emit while still non-null → clear+release → dispatch2", () => {
    const model = modelFor(continuousSpec());
    const log: string[] = [];
    let nullDispatches = 0;
    const base = createInteractionReducer();
    const wrapped: InteractionReducer = {
      ...base,
      dispatch: (action) => {
        if (action.type === "inspect" && action.candidate === null && action.source === "pointer") {
          nullDispatches++;
          log.push(`dispatch-inspect-null-${nullDispatches}`);
        }
        base.dispatch(action);
      },
      get state() {
        return base.state;
      },
    };

    const handle = withFlushedEffectRoot(() => {
      const controller = createInspectionState({
        model: () => model,
        reducer: () => wrapped,
        inspectConfig: defaultInspect,
        surfaceInteractive: () => true,
        inspectEnabled: () => true,
        dataIdentityEpoch: () => "epoch-1",
        keyAt: keyAtForModel(model),
        root: () => null,
        captureSurface: () => null,
        plotId: () => "plot",
        tooltipHovered: () => false,
        clearTooltipHovered: () => {},
        clearBrush: () => {},
        chooseTool: () => {},
        oninspect: () => (event) => {
          if (event.phase === "clear") {
            log.push(
              controller.inspection === null
                ? "emit-clear-while-null"
                : "emit-clear-while-non-null",
            );
          }
        },
        oninteraction: noInteraction,
        announce: () => {},
        clearAnnouncement: () => {},
      });
      return controller;
    });

    const { candidate, hit } = candidateHit(model);
    handle.value.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    log.length = 0;
    nullDispatches = 0;

    handle.value.setInspection(null, "pointer");
    // After clear completes, state is null (step 3 side effect of clear path).
    log.push(handle.value.inspection === null ? "state-cleared" : "state-still-set");

    // Exact host order (1173–1180): first inspect-null dispatch, clear emit while
    // inspection is still non-null, state cleared + coordinator release (between
    // emit and second dispatch), second inspect-null dispatch.
    expect(log).toEqual([
      "dispatch-inspect-null-1",
      "emit-clear-while-non-null",
      "dispatch-inspect-null-2",
      "state-cleared",
    ]);

    handle.destroy();
  });
});

describe("createInspectionState callback replacement", () => {
  it("reads current oninspect + oninteraction boxes on each emit", () => {
    const model = modelFor(continuousSpec());
    const inspectBox = reactiveBox<InspectCb>(noInspect());
    const interactionBox = reactiveBox<InteractionCb>(noInteraction());
    const inspectEvents: string[] = [];
    const interactionEvents: string[] = [];

    const { state, destroy } = mountInspectionController({
      model: () => model,
      oninspect: () => inspectBox.value,
      oninteraction: () => interactionBox.value,
      registerEffects: false,
    });

    const { candidate, hit } = candidateHit(model);
    // No callbacks → resolve still works; no events.
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    expect(inspectEvents).toEqual([]);

    inspectBox.set((event) => {
      inspectEvents.push(event.phase);
    });
    interactionBox.set((event) => {
      interactionEvents.push(event.type);
    });

    // Clear then re-apply so a fresh semantic emit fires.
    state.setInspection(null, "pointer");
    flushSync();
    // Clear may emit to the now-registered sinks.
    inspectEvents.length = 0;
    interactionEvents.length = 0;

    // Force a different candidate if available for a new fingerprint.
    let other: CandidateFacts | null = null;
    for (let id = 0; id < model.candidates.size; id++) {
      const c = model.candidates.candidate(id);
      if (c !== null && c.id !== candidate.id) {
        other = c;
        break;
      }
    }
    if (other === null) {
      // Same seed after clear still emits change when fingerprint differs from clear.
      state.setInspection(hit, "pointer", "transient", "xy", candidate);
    } else {
      state.setInspection(hitFromCandidate(other), "pointer", "transient", "xy", other);
    }
    flushSync();
    expect(inspectEvents).toContain("change");
    expect(interactionEvents).toContain("inspect");

    destroy();
  });
});

describe("createInspectionState completeness selection", () => {
  it("caps transient members at 8 and flips to complete when oninspect is enabled", () => {
    const model = modelFor(largeGroupSpec());
    // Group size must exceed the transient eight-member limit.
    expect(model.candidates.size).toBeGreaterThanOrEqual(12);

    const oninspectBox = reactiveBox<InspectCb>(noInspect());

    const { state, destroy } = mountInspectionController({
      model: () => model,
      // No custom content / callbacks → transient completeness.
      inspectConfig: modeXInspect,
      oninspect: () => oninspectBox.value,
      oninteraction: noInteraction,
      registerEffects: false,
    });

    const candidate = firstCandidate(model);
    const hit = hitFromCandidate(candidate);
    state.setInspection(hit, "pointer", "transient", "x", candidate);
    flushSync();
    expect(state.inspection).not.toBeNull();
    const transientCount = state.inspection!.members.length;
    expect(transientCount).toBe(8);

    // Enable oninspect (current deps) → complete resolve carries all members.
    oninspectBox.set(() => {});
    // Re-resolve via clear + apply so resolveInspectionCompleteness re-runs.
    state.setInspection(null, "pointer");
    flushSync();
    state.setInspection(hit, "pointer", "transient", "x", candidate);
    flushSync();
    expect(state.inspection!.members.length).toBeGreaterThan(8);
    expect(state.inspection!.members.length).toBe(12);

    destroy();
  });
});
