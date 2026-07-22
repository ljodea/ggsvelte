import { describe, expect, it, vi } from "vitest";

import {
  INTERACTION_DIAGNOSTIC_CATALOG,
  isAreaTool,
  normalizeInteractionConfig,
} from "../../src/lib/interaction/interaction.js";
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

describe("interaction capability normalization", () => {
  it("keeps static plots inert and uses reviewed defaults when opted in", () => {
    expect(normalizeInteractionConfig({})).toMatchObject({
      interactive: false,
      inspect: null,
      select: null,
      zoom: null,
      legendFocus: null,
      initialTool: "inspect",
    });

    expect(normalizeInteractionConfig({ inspect: true })).toMatchObject({
      interactive: true,
      inspect: {
        mode: "auto",
        pin: true,
        contentMode: "informational",
      },
      initialTool: "inspect",
    });
  });

  it("keeps legend focus opt-in and enables previews by default", () => {
    expect(normalizeInteractionConfig({ legendFocus: true })).toMatchObject({
      interactive: true,
      legendFocus: { preview: true },
      availableTools: [],
      initialTool: "inspect",
    });

    expect(normalizeInteractionConfig({ legendFocus: { preview: false } })).toMatchObject({
      interactive: true,
      legendFocus: { preview: false },
    });

    const withoutKey = normalizeInteractionConfig({ legendFocus: true }, { hasKey: false });
    expect(withoutKey.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "INTERACTION_LEGEND_REQUIRES_KEY",
        prop: "key",
      }),
    );
    expect(withoutKey.legendFocus).toBeNull();
    expect(withoutKey.interactive).toBe(false);
  });

  it("warns when coordinated interval presets have no stable key", () => {
    // Union combines stored record keys and cross-panel matches candidate
    // semantic keys — keyless rows silently select nothing beyond the
    // origin rectangle, so surface it like keyless point selection.
    for (const preset of ["union", "cross-panel"] as const) {
      const withoutKey = normalizeInteractionConfig(
        { select: { type: "interval", preset } },
        { hasKey: false },
      );
      expect(withoutKey.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "INTERACTION_INTERVAL_PRESET_REQUIRES_KEY",
          prop: "key",
        }),
      );
    }
    const independent = normalizeInteractionConfig(
      { select: { type: "interval" } },
      { hasKey: false },
    );
    expect(
      independent.diagnostics.some(
        (diagnostic) => diagnostic.code === "INTERACTION_INTERVAL_PRESET_REQUIRES_KEY",
      ),
    ).toBe(false);
    const keyed = normalizeInteractionConfig(
      { select: { type: "interval", preset: "union" } },
      { hasKey: true },
    );
    expect(keyed.diagnostics).toEqual([]);
  });

  it("starts interval capabilities in Inspect and never arms a drag implicitly", () => {
    const resolved = normalizeInteractionConfig({
      inspect: true,
      select: "interval",
      zoom: true,
    });
    expect(resolved.initialTool).toBe("inspect");
    expect(resolved.availableTools).toEqual(["inspect", "select-area", "zoom-area"]);
    expect(resolved.select).toMatchObject({ type: "interval", mode: "xy" });
    expect(resolved.zoom).toMatchObject({ mode: "xy", trigger: "brush" });
  });

  it("enables faceted interval selection and diagnoses only faceted brush zoom", () => {
    const resolved = normalizeInteractionConfig(
      { inspect: true, select: "interval", zoom: true },
      { faceted: true },
    );
    expect(resolved.inspect).not.toBeNull();
    expect(resolved.select).toMatchObject({ type: "interval", mode: "xy" });
    expect(resolved.zoom).toBeNull();
    expect(resolved.diagnostics[0]).toMatchObject({
      code: "INTERACTION_INTERVAL_FACET_UNSUPPORTED",
      severity: "warning",
      prop: "zoom",
    });
  });

  it("catalogues every emitted diagnostic", () => {
    const result = normalizeInteractionConfig(
      {
        select: { type: "interval", mode: "xy" },
        zoom: { mode: "xy", trigger: "brush" },
      },
      { faceted: true },
    );
    for (const diagnostic of result.diagnostics) {
      expect(INTERACTION_DIAGNOSTIC_CATALOG[diagnostic.code]).toBeDefined();
    }
  });

  it("keeps each catalog entry's code equal to its key (characterization)", () => {
    // Locks the catalog object shape so extract refactors cannot drift entry.code
    // away from the Record key (agents and docs look up by both).
    for (const [key, entry] of Object.entries(INTERACTION_DIAGNOSTIC_CATALOG)) {
      expect(entry.code).toBe(key);
    }
  });
});

describe("chart-local interaction reducer", () => {
  it("pins, unpins, dismisses transient content, and suppresses equal changes", () => {
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
    reducer.dispatch({
      type: "inspect",
      candidate: candidate(1),
      source: "pointer",
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(reducer.state.inspection.kind).toBe("transient");

    reducer.dispatch({ type: "toggle-pin", source: "pointer" });
    expect(reducer.state.inspection.kind).toBe("pinned");
    reducer.dispatch({
      type: "inspect",
      candidate: candidate(2),
      source: "pointer",
    });
    expect(reducer.state.inspection.candidate?.id).toBe(1);
    reducer.dispatch({ type: "escape", source: "keyboard" });
    expect(reducer.state.inspection.kind).toBe("idle");
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

  it("coalesces continuous pointer coordinates once per frame and lets boundaries cancel them", () => {
    let frame: (() => void) | null = null;
    const changes: number[] = [];
    const reducer = createInteractionReducer({
      scheduleFrame: (callback) => {
        frame = callback;
        return 1;
      },
      cancelFrame: () => {
        frame = null;
      },
      onChange: (state) => {
        changes.push(state.revision);
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
    expect(changes).toHaveLength(0);
    (frame as (() => void) | null)?.();
    expect(reducer.state.inspection.candidate?.id).toBe(2);
    expect(changes).toHaveLength(1);

    reducer.queuePointer({
      type: "inspect",
      candidate: candidate(3),
      source: "pointer",
    });
    reducer.dispatch({ type: "set-tool", tool: "zoom-area" });
    expect(frame).toBeNull();
    expect(reducer.state.inspection.candidate?.id).toBe(2);
  });
});
