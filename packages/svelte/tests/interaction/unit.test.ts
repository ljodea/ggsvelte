import { describe, expect, it, vi } from "vitest";

import { runPipeline, type CandidateFacts, type RenderModel } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";

import {
  INTERACTION_DIAGNOSTIC_CATALOG,
  isAreaTool,
  normalizeInteractionConfig,
} from "../../src/lib/interaction/interaction.js";
import {
  createInteractionReducer,
  type InteractionCandidateRef,
} from "../../src/lib/interaction/reducer.js";
import {
  clearInspectionFingerprint,
  createInspectionCoordinator,
  resolveInspection,
} from "../../src/lib/inspection/resolver.js";

const candidate = (id: number): InteractionCandidateRef => ({
  epoch: 1,
  id,
  panelId: "panel:all",
  x: 10 + id,
  y: 20 + id,
});

function sameKindBatchOrdinal(model: RenderModel, seed: CandidateFacts): number {
  return (
    model.scene.batches
      .slice(0, seed.batchIndex + 1)
      .filter((batch) => batch.layerIndex === seed.layerIndex && batch.kind === seed.kind).length -
    1
  );
}

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

describe("clearInspectionFingerprint", () => {
  it("scopes clear dedupe tokens by interaction source", () => {
    expect(clearInspectionFingerprint("pointer")).toBe("clear:pointer");
    expect(clearInspectionFingerprint("keyboard")).toBe("clear:keyboard");
    expect(clearInspectionFingerprint("programmatic")).toBe("clear:programmatic");
    expect(clearInspectionFingerprint("pointer")).not.toBe(clearInspectionFingerprint("touch"));
  });
});

describe("semantic inspection resolver", () => {
  it("uses one core grouped target for focus, legend order, fields, and lineage", () => {
    const data = [
      { id: "a1", x: 1, y: 3, series: "a" },
      { id: "b1", x: 1, y: 7, series: "b" },
      { id: "a2", x: 2, y: 4, series: "a" },
      { id: "b2", x: 2, y: 8, series: "b" },
    ];
    const spec = gg(data, aes({ x: "x", y: "y", color: "series" }))
      .geomLine()
      .spec();
    const model = runPipeline(spec, { width: 480, height: 320 });
    const seed = model.candidates.candidate(0)!;
    const inspection = resolveInspection({
      model,
      seed,
      mode: "x",
      state: "transient",
      source: "pointer",
      keyOf: (row) => row.id as string,
    });
    expect(inspection.mode).toBe("x");
    expect(inspection.axisValue).toBe(1);
    expect(inspection.members).toHaveLength(2);
    expect(inspection.members.map((member) => member.key)).toEqual(["a1", "b1"]);
    expect(inspection.members).toContain(inspection.focus);
    expect(inspection.focus.lineageCount).toBe(1);
    model.dispose();
  });

  it("materializes at most eight transient members and owns exactly two memo slots", () => {
    const data = Array.from({ length: 12 }, (_, index) => ({
      id: `row-${index}`,
      x: 1,
      y: index,
      series: `series-${index}`,
    }));
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y", color: "series" }))
        .geomPoint()
        .spec(),
      { width: 480, height: 320 },
    );
    const coordinator = createInspectionCoordinator((row) => row.id as string);
    const base = {
      model,
      seed: model.candidates.candidate(0)!,
      mode: "x" as const,
      source: "pointer" as const,
      identityEpoch: 1,
      layoutEpoch: 1,
    };
    const transient = coordinator.resolve({ ...base, state: "transient" })!;
    expect(transient.snapshot.members).toHaveLength(8);
    expect(coordinator.resolve({ ...base, state: "transient" })).toBe(transient);
    const pinned = coordinator.resolve({ ...base, state: "pinned" })!;
    expect(pinned.snapshot.members).toHaveLength(12);
    expect(coordinator.memoSize).toBe(2);
    coordinator.release("pinned");
    expect(coordinator.memoSize).toBe(1);
    coordinator.invalidate();
    expect(coordinator.memoSize).toBe(0);
    model.dispose();
  });

  it("separates semantic changes from presentation-only layout changes", () => {
    const data = [
      { id: "a", x: 1, y: 2 },
      { id: "b", x: 2, y: 3 },
    ];
    const makeModel = (width: number) =>
      runPipeline(
        gg(data, aes({ x: "x", y: "y" }))
          .geomPoint()
          .spec(),
        {
          width,
          height: 300,
        },
      );
    const first = makeModel(400);
    const coordinator = createInspectionCoordinator((row) => row.id as string);
    coordinator.resolve({
      model: first,
      seed: first.candidates.candidate(0)!,
      mode: "xy",
      state: "pinned",
      source: "pointer",
      identityEpoch: "data-1",
      layoutEpoch: "layout-1",
    });
    const resized = makeModel(700);
    const reconciled = coordinator.reconcilePinned({
      model: resized,
      identityEpoch: "data-1",
      layoutEpoch: "layout-2",
    })!;
    expect(reconciled.semanticChanged).toBe(false);
    expect(reconciled.presentationChanged).toBe(true);
    first.dispose();
    resized.dispose();
  });

  it("reconciles pins from their unique stable seed and invalidates keyless pins on data epochs", () => {
    const makeModel = (rows: { id: string; x: number; y: number }[], width = 400) =>
      runPipeline(
        gg(rows, aes({ x: "x", y: "y" }))
          .geomPoint()
          .spec(),
        {
          width,
          height: 300,
        },
      );
    const first = makeModel([{ id: "a", x: 1, y: 2 }]);
    const keyed = createInspectionCoordinator((row) => row.id as string);
    keyed.resolve({
      model: first,
      seed: first.candidates.candidate(0)!,
      mode: "xy",
      state: "pinned",
      source: "pointer",
      identityEpoch: 1,
      layoutEpoch: 1,
    });
    const moved = makeModel([{ id: "a", x: 4, y: 8 }], 600);
    const movedPin = keyed.reconcilePinned({
      model: moved,
      identityEpoch: 2,
      layoutEpoch: 2,
    })!;
    expect(movedPin.snapshot.focus.key).toBe("a");
    expect(movedPin.snapshot.source).toBe("programmatic");
    expect(movedPin.semanticChanged).toBe(true);
    expect(movedPin.snapshot.focus.anchor).not.toEqual(
      keyed.resolve({
        model: first,
        seed: first.candidates.candidate(0)!,
        mode: "xy",
        state: "transient",
        source: "pointer",
        identityEpoch: 1,
        layoutEpoch: 1,
      })!.snapshot.focus.anchor,
    );

    const keyless = createInspectionCoordinator(() => null);
    keyless.resolve({
      model: first,
      seed: first.candidates.candidate(0)!,
      mode: "xy",
      state: "pinned",
      source: "pointer",
      identityEpoch: "same-data",
      layoutEpoch: 1,
    });
    const keylessResized = makeModel([{ id: "a", x: 1, y: 2 }], 650);
    expect(
      keyless.reconcilePinned({
        model: keylessResized,
        identityEpoch: "same-data",
        layoutEpoch: 2,
      }),
    ).not.toBeNull();
    expect(
      keyless.reconcilePinned({
        model: moved,
        identityEpoch: "new-data",
        layoutEpoch: 3,
      }),
    ).toBeNull();

    const ambiguous = makeModel([
      { id: "a", x: 4, y: 8 },
      { id: "a", x: 5, y: 9 },
    ]);
    keyed.resolve({
      model: moved,
      seed: moved.candidates.candidate(0)!,
      mode: "xy",
      state: "pinned",
      source: "pointer",
      identityEpoch: 2,
      layoutEpoch: 2,
    });
    expect(
      keyed.reconcilePinned({
        model: ambiguous,
        identityEpoch: 3,
        layoutEpoch: 3,
      }),
    ).toBeNull();
    first.dispose();
    moved.dispose();
    ambiguous.dispose();
    keylessResized.dispose();
  });

  it("keeps a synthetic keyless seed across a layout-only epoch", () => {
    const data = [{ x: "a" }, { x: "a" }, { x: "b" }];
    const makeModel = (width: number) =>
      runPipeline(
        gg(data, aes({ x: "x" }))
          .geomBar()
          .spec(),
        { width, height: 300 },
      );
    const first = makeModel(400);
    const coordinator = createInspectionCoordinator(() => null);
    coordinator.resolve({
      model: first,
      seed: first.candidates.candidate(0)!,
      mode: "exact",
      state: "pinned",
      source: "pointer",
      identityEpoch: "same-data",
      layoutEpoch: 1,
    });
    const resized = makeModel(700);
    expect(
      coordinator.reconcilePinned({
        model: resized,
        identityEpoch: "same-data",
        layoutEpoch: 2,
      }),
    ).not.toBeNull();
    first.dispose();
    resized.dispose();
  });

  it("reconciles the stable batch role of synthetic composite marks", () => {
    const smoothSpec = gg(
      [
        { x: 0, y: 1 },
        { x: 1, y: 3 },
        { x: 2, y: 5 },
      ],
      aes({ x: "x", y: "y" }),
    )
      .geomSmooth({ method: "lm" })
      .spec();
    const boxSpec = gg(
      [
        { group: "a", y: 1 },
        { group: "a", y: 2 },
        { group: "a", y: 3 },
        { group: "a", y: 100 },
      ],
      aes({ x: "group", y: "y" }),
    )
      .geomBoxplot()
      .spec();

    for (const spec of [smoothSpec, boxSpec]) {
      const first = runPipeline(spec, { width: 400, height: 300 });
      const resized = runPipeline(spec, { width: 700, height: 300 });
      const collidingSeeds = Array.from({ length: first.candidates.size }, (_, id) =>
        first.candidates.candidate(id)!,
      ).filter((fact, _, all) =>
        all.some(
          (other) =>
            other.id !== fact.id &&
            other.layerIndex === fact.layerIndex &&
            other.kind === fact.kind &&
            other.primitiveIndex === fact.primitiveIndex &&
            other.xValue === fact.xValue &&
            other.yValue === fact.yValue,
        ),
      );
      expect(collidingSeeds.length).toBeGreaterThanOrEqual(2);

      for (const seed of collidingSeeds) {
        const coordinator = createInspectionCoordinator(() => null);
        coordinator.resolve({
          model: first,
          seed,
          mode: seed.autoMode,
          state: "pinned",
          source: "pointer",
          identityEpoch: "same-data",
          layoutEpoch: first.runId,
        });
        const reconciled = coordinator.reconcilePinned({
          model: resized,
          identityEpoch: "same-data",
          layoutEpoch: resized.runId,
        });
        expect(reconciled).not.toBeNull();
        expect(sameKindBatchOrdinal(resized, reconciled!.seed)).toBe(
          sameKindBatchOrdinal(first, seed),
        );
      }
      first.dispose();
      resized.dispose();
    }
  });

  it("transient fingerprint does not read every row in a large axis group", () => {
    // Complexity: fingerprint used to walk all M members (Object.keys each row)
    // before the slot cache check. Transient now caps at TRANSIENT_MEMBER_LIMIT (8).
    const n = 400;
    const data = Array.from({ length: n }, (_, i) => ({
      id: `r${i}`,
      x: 1,
      y: i,
    }));
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y", color: "id" }))
        .geomPoint()
        .spec(),
      { width: 400, height: 300 },
    );
    const originalRow = model.row.bind(model);
    let rowReads = 0;
    vi.spyOn(model, "row").mockImplementation((index: number) => {
      rowReads++;
      return originalRow(index);
    });
    const coordinator = createInspectionCoordinator((row) => (row as { id: string }).id);
    rowReads = 0;
    const resolved = coordinator.resolve({
      model,
      seed: model.candidates.candidate(0)!,
      mode: "x",
      state: "transient",
      source: "pointer",
      identityEpoch: 1,
      layoutEpoch: "layout-1",
      completeness: "transient",
    });
    expect(resolved).not.toBeNull();
    // Full-group fingerprint would read ~n member rows (+ focus). Cap ≈ 8 members + focus + materialize.
    expect(rowReads).toBeLessThan(40);
    expect(rowReads).toBeLessThan(n / 5);
    model.dispose();
  });

  it("fingerprints null/Date/-0 cells and symbol keys in coordinated snapshots", () => {
    const data = [
      { id: "a", x: 1, y: 2 },
      { id: "b", x: 1, y: 3 },
    ];
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y", color: "id" }))
        .geomPoint()
        .spec(),
      { width: 400, height: 300 },
    );
    // Inject cell shapes cellToken handles specially (null / Date / -0) without
    // going through PortableSpec validation, which rejects Date/null payloads.
    const originalRow = model.row.bind(model);
    vi.spyOn(model, "row").mockImplementation((index: number) => {
      const base = originalRow(index);
      if (base === null) return null;
      return {
        ...base,
        note: index === 0 ? null : "ok",
        when: new Date("2020-01-01T00:00:00Z"),
        y: index === 1 ? -0 : base["y"],
      };
    });
    const symbols = new Map<string, symbol>([
      ["a", Symbol("a")],
      ["b", Symbol("b")],
    ]);
    const coordinator = createInspectionCoordinator((row) => {
      const id = String(row.id);
      return symbols.get(id) ?? null;
    });
    const epoch = Symbol("layout");
    const resolved = coordinator.resolve({
      model,
      seed: model.candidates.candidate(0)!,
      mode: "x",
      state: "transient",
      source: "pointer",
      identityEpoch: 1,
      layoutEpoch: epoch,
    });
    expect(resolved).not.toBeNull();
    expect(resolved!.snapshot.members.length).toBeGreaterThanOrEqual(1);
    // Symbol keys must stay distinct across the same string identity.
    expect([...new Set(resolved!.semanticFingerprint.match(/symbol:\d+/g) ?? [])]).toEqual([
      "symbol:0",
      "symbol:1",
    ]);
    // null/Date/-0 all contribute typed cell tokens to the fingerprint payload.
    expect(resolved!.semanticFingerprint).toContain("note=null");
    expect(resolved!.semanticFingerprint).toContain("when=date:1577836800000");
    expect(resolved!.semanticFingerprint).toContain("y=number:0");
    // Re-resolve with the same symbol layout epoch must hit the memo slot.
    expect(
      coordinator.resolve({
        model,
        seed: model.candidates.candidate(0)!,
        mode: "x",
        state: "transient",
        source: "pointer",
        identityEpoch: 1,
        layoutEpoch: epoch,
      }),
    ).toBe(resolved);
    model.dispose();
  });

  it("falls back to a single-member snapshot when axis grouping has no bucket", () => {
    const model = runPipeline(
      gg([{ id: "a", x: 1, y: 2 }], aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      { width: 300, height: 200 },
    );
    const seed = model.candidates.candidate(0)!;
    // group() owns bucket validity; force a null group so resolveInspection's
    // total fallback materializes a single-member axis snapshot.
    vi.spyOn(model.candidates, "group").mockReturnValue(null);
    const inspection = resolveInspection({
      model,
      seed: { ...seed, xValue: null, yValue: null },
      mode: "x",
      state: "pinned",
      source: "keyboard",
      keyOf: (row) => row.id as string,
    });
    expect(inspection.mode).toBe("x");
    expect(inspection.members).toHaveLength(1);
    expect(inspection.focus.key).toBe("a");
    expect(inspection.axisValue).toBeNull();
    expect(inspection.axisLabel).toBe("–");
    model.dispose();
  });

  it("returns null from reconcilePinned when no pin is active", () => {
    const model = runPipeline(
      gg([{ id: "a", x: 1, y: 2 }], aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      { width: 300, height: 200 },
    );
    const coordinator = createInspectionCoordinator((row) => row.id as string);
    expect(
      coordinator.reconcilePinned({
        model,
        identityEpoch: 1,
        layoutEpoch: 1,
      }),
    ).toBeNull();
    model.dispose();
  });

  it("disambiguates multi-match pins that share one source row via batch role", () => {
    const smoothSpec = gg(
      [
        { x: 0, y: 1 },
        { x: 1, y: 3 },
        { x: 2, y: 5 },
      ],
      aes({ x: "x", y: "y" }),
    )
      .geomSmooth({ method: "lm" })
      .spec();
    const first = runPipeline(smoothSpec, { width: 400, height: 300 });
    const resized = runPipeline(smoothSpec, { width: 700, height: 300 });
    // Keyed coordinator with a constant key so every candidate maps to the same key —
    // reconcile then uses seedKind/batchRole/primitiveIndex to pick one match.
    const coordinator = createInspectionCoordinator(() => "smooth");
    const seed = first.candidates.candidate(0)!;
    coordinator.resolve({
      model: first,
      seed,
      mode: "exact",
      state: "pinned",
      source: "pointer",
      identityEpoch: "same-data",
      layoutEpoch: first.runId,
    });
    const reconciled = coordinator.reconcilePinned({
      model: resized,
      identityEpoch: "same-data",
      layoutEpoch: resized.runId,
    });
    expect(reconciled).not.toBeNull();
    expect(reconciled!.seed.kind).toBe(seed.kind);
    expect(reconciled!.seed.primitiveIndex).toBe(seed.primitiveIndex);
    expect(sameKindBatchOrdinal(resized, reconciled!.seed)).toBe(sameKindBatchOrdinal(first, seed));
    first.dispose();
    resized.dispose();
  });

  it("dedups aggregate sourceKeys in first-seen order and skips null keyOf results", () => {
    // keyOf maps: skip → null, a2 → "a", b2 → "b", else id.
    // Unique non-null keys are {a,b,c}; order follows first lineage appearance.
    const data = [
      { id: "a", g: "g" },
      { id: "skip", g: "g" },
      { id: "b", g: "g" },
      { id: "a2", g: "g" },
      { id: "c", g: "g" },
      { id: "b2", g: "g" },
    ];
    const model = runPipeline(
      {
        data: { values: data },
        layers: [{ geom: "bar", aes: { x: { field: "g" } } }],
      },
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    const keyOf = (row: { id: string }): string | null => {
      if (row.id === "skip") return null;
      if (row.id === "a2") return "a";
      if (row.id === "b2") return "b";
      return row.id;
    };
    // Oracle: first-seen non-null keys along the published lineage order.
    const firstSeen: string[] = [];
    for (const rowIndex of model.lineage.keys(seed.lineage)) {
      const row = model.row(rowIndex) as { id: string } | null;
      if (row === null) continue;
      const key = keyOf(row);
      if (key !== null && !firstSeen.includes(key)) firstSeen.push(key);
    }
    expect(new Set(firstSeen)).toEqual(new Set(["a", "b", "c"]));
    expect(firstSeen).toHaveLength(3);

    const inspection = resolveInspection({
      model,
      seed,
      mode: "exact",
      state: "transient",
      source: "pointer",
      keyOf: (row) => keyOf(row as { id: string }),
    });
    expect(inspection.focus.sourceKeys).toEqual(firstSeen);
    expect(inspection.focus.lineageCount).toBe(6);
    model.dispose();
  });

  // Source-key dedup uses uniqueKeysFromRowIndexes (Set membership), not
  // Array#includes on the growing list — O(R) instead of O(R²) for large
  // aggregate lineages (#200). Wall-clock ratio guards flake under CI
  // contention; structural O(R) is owned by the shared helper (selection #182).
  it("materializes all-unique large lineage sourceKeys in first-seen order", () => {
    const n = 2_000;
    const data = Array.from({ length: n }, (_, index) => ({
      id: `row-${index}`,
      g: "g",
    }));
    const model = runPipeline(
      {
        data: { values: data },
        layers: [{ geom: "bar", aes: { x: { field: "g" } } }],
      },
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    expect(model.lineage.count(seed.lineage)).toBe(n);
    const lineageRows = model.lineage.keys(seed.lineage);
    const firstId = (model.row(lineageRows[0]) as { id: string }).id;
    const lastId = (model.row(lineageRows[n - 1]) as { id: string }).id;

    const inspection = resolveInspection({
      model,
      seed,
      mode: "exact",
      state: "transient",
      source: "pointer",
      keyOf: (row) => row.id as string,
    });
    expect(inspection.focus.sourceKeys).toHaveLength(n);
    expect(inspection.focus.sourceKeys[0]).toBe(firstId);
    expect(inspection.focus.sourceKeys[n - 1]).toBe(lastId);
    model.dispose();
  });

  // Keyless reconcilePinned must apply cheap layer/row/kind filters before
  // materializing lineage identity joins (issue #229). Without early exit,
  // every candidate pays O(L) join cost even when it cannot match.
  it("skips lineage.keys for keyless pin candidates that fail cheap filters", () => {
    const data = Array.from({ length: 40 }, (_, index) => ({
      id: `r${index}`,
      x: index,
      y: (index % 7) + 1,
    }));
    const makeModel = (width: number) =>
      runPipeline(
        gg(data, aes({ x: "x", y: "y" }))
          .geomPoint()
          .spec(),
        { width, height: 300 },
      );
    const first = makeModel(400);
    const resized = makeModel(700);
    expect(first.candidates.size).toBeGreaterThan(10);

    const coordinator = createInspectionCoordinator(() => null);
    const seed = first.candidates.candidate(0)!;
    coordinator.resolve({
      model: first,
      seed,
      mode: "exact",
      state: "pinned",
      source: "pointer",
      identityEpoch: "same-data",
      layoutEpoch: 1,
    });

    const keysSpy = vi.spyOn(resized.lineage, "keys");
    const reconciled = coordinator.reconcilePinned({
      model: resized,
      identityEpoch: "same-data",
      layoutEpoch: 2,
    });
    expect(reconciled).not.toBeNull();
    // Cheap-filter survivors are O(matches); a full-store join walk is O(C).
    // Materialization may call keys a few more times for the matched seed.
    expect(keysSpy.mock.calls.length).toBeLessThan(resized.candidates.size);
    first.dispose();
    resized.dispose();
  });

  // Layout-only rebind (same identityEpoch) must revalidate via stored seedId
  // instead of scanning every candidate (O(C) keyOf / cheap-filter walk).
  it("does not scan every candidate on layout-only keyed pin rebind", () => {
    const count = 2_000;
    const data = Array.from({ length: count }, (_, index) => ({
      id: `r${index}`,
      x: index,
      y: (index % 11) + 1,
    }));
    const makeModel = (width: number) =>
      runPipeline(
        gg(data, aes({ x: "x", y: "y" }))
          .geomPoint()
          .spec(),
        { width, height: 300 },
      );
    const first = makeModel(400);
    const resized = makeModel(700);
    expect(resized.candidates.size).toBe(count);

    const coordinator = createInspectionCoordinator((row) => (row as { id: string }).id);
    coordinator.resolve({
      model: first,
      seed: first.candidates.candidate(0)!,
      mode: "exact",
      state: "pinned",
      source: "pointer",
      identityEpoch: "layout-stable",
      layoutEpoch: 1,
    });

    const candidateSpy = vi.spyOn(resized.candidates, "candidate");
    const reconciled = coordinator.reconcilePinned({
      model: resized,
      identityEpoch: "layout-stable",
      layoutEpoch: 2,
    });
    expect(reconciled).not.toBeNull();
    expect(reconciled!.snapshot.focus.key).toBe("r0");
    // seedId O(1) + materialize; a full rebind walk is ~C candidate() lookups.
    expect(candidateSpy.mock.calls.length).toBeLessThan(32);
    expect(candidateSpy.mock.calls.length).toBeLessThan(count / 20);
    first.dispose();
    resized.dispose();
  });

  // Same identityEpoch can still change primitives (layer-prop geom swap).
  // Fast path must require kind/batch/primitive, not only layer+key (#272 P2).
  it("rejects keyed seedId fast path when primitive role no longer matches", () => {
    const data = [{ id: "a", x: 1, y: 2, ymin: 1, ymax: 3 }];
    const points = runPipeline(
      gg(data, aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      { width: 400, height: 300 },
    );
    const errorbars = runPipeline(
      gg(data, aes({ x: "x", y: "y", ymin: "ymin", ymax: "ymax" }))
        .geomErrorbar()
        .spec(),
      { width: 400, height: 300 },
    );
    const coordinator = createInspectionCoordinator((row) => (row as { id: string }).id);
    const seed = points.candidates.candidate(0)!;
    expect(seed.kind).toBe("points");
    coordinator.resolve({
      model: points,
      seed,
      mode: "exact",
      state: "pinned",
      source: "pointer",
      identityEpoch: "same-epoch",
      layoutEpoch: 1,
    });
    // Same epoch token, different geom at seedId — role mismatch must not pin.
    const atSameId = errorbars.candidates.candidate(seed.id);
    expect(atSameId).not.toBeNull();
    expect(atSameId!.kind).not.toBe("points");
    const reconciled = coordinator.reconcilePinned({
      model: errorbars,
      identityEpoch: "same-epoch",
      layoutEpoch: 2,
    });
    // Full scan finds no points-role match for key "a" → clear pin.
    expect(reconciled).toBeNull();
    points.dispose();
    errorbars.dispose();
  });

  it("does not scan every candidate on layout-only keyless pin rebind", () => {
    const count = 2_000;
    const data = Array.from({ length: count }, (_, index) => ({
      id: `r${index}`,
      x: index,
      y: (index % 11) + 1,
    }));
    const makeModel = (width: number) =>
      runPipeline(
        gg(data, aes({ x: "x", y: "y" }))
          .geomPoint()
          .spec(),
        { width, height: 300 },
      );
    const first = makeModel(400);
    const resized = makeModel(700);

    const coordinator = createInspectionCoordinator(() => null);
    coordinator.resolve({
      model: first,
      seed: first.candidates.candidate(7)!,
      mode: "exact",
      state: "pinned",
      source: "pointer",
      identityEpoch: "layout-stable",
      layoutEpoch: 1,
    });

    const candidateSpy = vi.spyOn(resized.candidates, "candidate");
    const reconciled = coordinator.reconcilePinned({
      model: resized,
      identityEpoch: "layout-stable",
      layoutEpoch: 2,
    });
    expect(reconciled).not.toBeNull();
    expect(candidateSpy.mock.calls.length).toBeLessThan(32);
    expect(candidateSpy.mock.calls.length).toBeLessThan(count / 20);
    first.dispose();
    resized.dispose();
  });

  // uniqueKeysFromRowIndexes builds one membership Set for the lineage walk
  // (issue #200). Array#includes-based first-seen would construct zero Sets.
  it("allocates a membership Set when materializing aggregate sourceKeys", () => {
    const data = Array.from({ length: 40 }, (_, index) => ({
      id: `row-${index}`,
      g: "g",
    }));
    const model = runPipeline(
      {
        data: { values: data },
        layers: [{ geom: "bar", aes: { x: { field: "g" } } }],
      },
      { width: 400, height: 300 },
    );
    const seed = model.candidates.candidate(0)!;
    const RealSet = globalThis.Set;
    let constructions = 0;
    globalThis.Set = class CountingSet<T> extends RealSet<T> {
      constructor(iterable?: Iterable<T>) {
        super(iterable);
        constructions += 1;
      }
    } as SetConstructor;
    try {
      const inspection = resolveInspection({
        model,
        seed,
        mode: "exact",
        state: "transient",
        source: "pointer",
        keyOf: (row) => row.id as string,
      });
      expect(inspection.focus.sourceKeys).toHaveLength(40);
      expect(constructions).toBeGreaterThanOrEqual(1);
    } finally {
      globalThis.Set = RealSet;
      model.dispose();
    }
  });
});
