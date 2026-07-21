import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it, vi } from "vitest";

import { createPlotInteraction } from "../../src/lib/interaction/controller.svelte.js";
import type { PlotInteractionTransition } from "../../src/lib/interaction/interaction.js";

const scope = {
  keys: "penguin-id",
  x: "flipper-mm",
  y: "body-mass-g",
} as const;

describe("createPlotInteraction", () => {
  it("stores frozen semantic intervals per stable panel identity", () => {
    const controller = createPlotInteraction<string>();
    const intervalScope = { ...scope, intervals: "penguin-facets" } as const;

    const transition = controller.setInterval(
      {
        panelId: "facet:v1:species=Adelie",
        preset: "independent",
        domains: {
          x: { kind: "linear", domain: [210, 180] },
          y: { kind: "band", values: ["s:Female", "s:Male", "s:Female"] },
        },
        keys: ["b", "a", "b"],
      },
      { scope: intervalScope, source: "keyboard" },
    );

    expect(transition).toMatchObject({ kind: "interval", changes: ["interval"] });
    expect(controller.intervals(intervalScope)).toEqual([
      {
        scope: "penguin-facets",
        panelId: "facet:v1:species=Adelie",
        preset: "independent",
        domains: {
          x: { kind: "linear", transform: "identity", domain: [180, 210] },
          y: { kind: "band", values: ["s:Female", "s:Male"] },
        },
        keys: ["a", "b"],
      },
    ]);
    const stored = controller.intervals(intervalScope)[0];
    expect(Object.isFrozen(stored)).toBe(true);
    expect(Object.isFrozen(stored.domains)).toBe(true);
    expect(Object.isFrozen(stored.domains.x)).toBe(true);
    expect(Object.isFrozen(stored.domains.x!.domain)).toBe(true);
    expect(Object.isFrozen(stored.domains.y!.values)).toBe(true);
    expect(Object.isFrozen(stored.keys)).toBe(true);
    expect(JSON.stringify(stored)).not.toMatch(/pixel|renderer|node|candidate|row/i);
  });

  it("supports independent and union panel records while cross-panel has one origin", () => {
    const controller = createPlotInteraction<number>();
    const options = { scope: { keys: "id", intervals: "facets" } } as const;
    const make = (panelId: string, preset: "independent" | "union" | "cross-panel") => ({
      panelId,
      preset,
      domains: { x: { kind: "time" as const, domain: [200, 100] as const } },
      keys: [panelId.length],
    });

    controller.setInterval(make("a", "independent"), options);
    controller.setInterval(make("b", "independent"), options);
    expect(controller.intervals(options.scope).map(({ panelId }) => panelId)).toEqual(["a", "b"]);

    // A preset switch is atomic and cannot leave ambiguous consumption semantics.
    controller.setInterval(make("b", "union"), options);
    expect(controller.intervals(options.scope)).toMatchObject([{ panelId: "b", preset: "union" }]);
    controller.setInterval(make("a", "union"), options);
    expect(controller.intervals(options.scope).map(({ panelId }) => panelId)).toEqual(["a", "b"]);

    controller.setInterval(make("origin", "cross-panel"), options);
    expect(controller.intervals(options.scope)).toMatchObject([
      { panelId: "origin", preset: "cross-panel" },
    ]);
    expect(controller.setInterval(make("origin", "cross-panel"), options)).toBeNull();
    controller.setInterval(make("new-origin", "cross-panel"), options);
    expect(controller.intervals(options.scope)).toMatchObject([
      { panelId: "new-origin", preset: "cross-panel" },
    ]);
  });

  it("clears one panel or an interval namespace with stable no-op revisions", () => {
    const transitions: PlotInteractionTransition<string>[] = [];
    const controller = createPlotInteraction<string>({
      onchange: (value) => {
        transitions.push(value);
      },
    });
    const options = { scope: { keys: "id", intervals: "facets" } } as const;
    const interval = (panelId: string) => ({
      panelId,
      preset: "union" as const,
      domains: {
        y: { kind: "linear" as const, transform: "log10" as const, domain: [100, 10] as const },
      },
      keys: [panelId],
    });
    controller.setInterval(interval("a"), options);
    controller.setInterval(interval("b"), options);

    expect(controller.clearInterval("missing", options)).toBeNull();
    expect(controller.clearInterval("a", options)?.kind).toBe("interval");
    expect(controller.intervals(options.scope).map(({ panelId }) => panelId)).toEqual(["b"]);
    expect(controller.clearIntervals(options)?.kind).toBe("interval");
    expect(controller.clearIntervals(options)).toBeNull();
    expect(controller.revision).toBe(4);
    expect(transitions).toHaveLength(4);
  });

  it("rejects invalid semantic intervals and reentrant interval mutations", () => {
    const options = { scope: { keys: "id", intervals: "facets" } } as const;
    let controller: ReturnType<typeof createPlotInteraction<string>>;
    let reentrantError: unknown;
    controller = createPlotInteraction<string>({
      onchange: () => {
        try {
          controller.clearIntervals(options);
        } catch (error) {
          reentrantError = error;
        }
      },
    });
    controller.setInterval(
      {
        panelId: "a",
        preset: "independent",
        domains: { x: { kind: "linear", domain: [0, 1] } },
        keys: [],
      },
      options,
    );
    expect(reentrantError).toBeInstanceOf(TypeError);
    expect(controller.intervals(options.scope)).toHaveLength(1);

    expect(() =>
      controller.setInterval(
        {
          panelId: "a",
          preset: "independent",
          domains: { x: { kind: "linear", transform: "log10", domain: [0, 1] } },
          keys: [],
        },
        options,
      ),
    ).toThrow(/positive/);
    expect(() =>
      controller.setInterval(
        {
          panelId: "a",
          preset: "independent",
          domains: { x: { kind: "linear", transform: "sqrt", domain: [-1, 1] } },
          keys: [],
        },
        options,
      ),
    ).toThrow(/non-negative/);
    // The pre-PR-3 transient kind:"log" is a stale wire shape, not a
    // recognized family — rejected outright, with no branch reinterpreting
    // it as transform:"log10".
    expect(() =>
      controller.setInterval(
        {
          panelId: "a",
          preset: "independent",
          domains: { x: fromAny({ kind: "log", domain: [1, 10] }) },
          keys: [],
        },
        options,
      ),
    ).toThrow(/not supported/);
    expect(() =>
      controller.setInterval(
        {
          panelId: "a",
          preset: "independent",
          domains: {},
          keys: [],
        },
        options,
      ),
    ).toThrow(/x or y/);
    expect(controller.revision).toBe(1);
  });

  it("canonicalizes stable keys and emits one immutable transition per actual mutation", () => {
    const transitions: PlotInteractionTransition<string>[] = [];
    const controller = createPlotInteraction<string>({
      onchange: (transition) => {
        transitions.push(transition);
      },
    });

    const first = controller.setSelection(["gentoo", "adelie", "gentoo"], {
      scope,
      source: "keyboard",
    });
    expect(first).toMatchObject({ revision: 1, kind: "selection", source: "keyboard", scope });
    expect(controller.revision).toBe(1);
    expect(controller.selected(scope)).toEqual(["adelie", "gentoo"]);
    expect(Object.isFrozen(controller.selected(scope))).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first!.snapshot)).toBe(true);

    expect(controller.setSelection(["gentoo", "adelie"], { scope })).toBeNull();
    expect(controller.revision).toBe(1);
    expect(transitions).toHaveLength(1);

    controller.toggleSelection("chinstrap", { scope });
    controller.toggleSelection("adelie", { scope });
    expect(controller.selected(scope)).toEqual(["chinstrap", "gentoo"]);
    expect(controller.revision).toBe(3);
    expect(transitions.map((transition) => transition.revision)).toEqual([1, 2, 3]);
  });

  it("rejects reentrant mutations and preserves the origin transition snapshot", () => {
    const transitions: PlotInteractionTransition<string>[] = [];
    let reentrantError: unknown;
    let controller: ReturnType<typeof createPlotInteraction<string>>;
    controller = createPlotInteraction<string>({
      onchange: (transition) => {
        transitions.push(transition);
        if (transition.revision === 1) {
          try {
            controller.setSelection(["second"], { scope });
          } catch (error) {
            reentrantError = error;
          }
        }
      },
    });

    const origin = controller.setSelection(["first"], { scope, source: "pointer" });

    expect(transitions.map((transition) => transition.revision)).toEqual([1]);
    expect(reentrantError).toBeInstanceOf(TypeError);
    expect(origin?.snapshot.selections[0]?.keys).toEqual(["first"]);
    expect(controller.selected(scope)).toEqual(["first"]);
  });

  it("keeps selection and emphasis isolated by semantic key scope", () => {
    const controller = createPlotInteraction<number>();
    controller.setSelection([3, 1, 2], { scope: "row-id" });
    controller.setEmphasis([2], { scope: "row-id" });
    controller.setSelection([9], { scope: "station-id" });

    expect(controller.selected("row-id")).toEqual([1, 2, 3]);
    expect(controller.selected("station-id")).toEqual([9]);
    expect(controller.selected("wrong-id")).toEqual([]);
    expect(controller.emphasized("row-id")).toEqual([2]);
    expect(controller.emphasized("station-id")).toEqual([]);
    expect(controller.isSelected(2, "row-id")).toBe(true);
    expect(controller.isSelected(2, "station-id")).toBe(false);

    controller.clearSelection({ scope: "wrong-id" });
    controller.clearEmphasis({ scope: "station-id" });
    expect(controller.revision).toBe(3);
  });

  // Membership Sets keep isSelected / toggleSelection O(1) in K, not O(K)
  // Array#includes. Large multi-selects (brush) must stay correct without
  // rescanning the ordered list on every probe.
  it("isSelected and toggle membership handle large multi-selects", () => {
    const controller = createPlotInteraction<number>();
    const count = 5_000;
    const keys = Array.from({ length: count }, (_, i) => i);
    controller.setSelection(keys, { scope: "row-id" });
    expect(controller.isSelected(count - 1, "row-id")).toBe(true);
    expect(controller.isSelected(count, "row-id")).toBe(false);
    controller.toggleSelection(0, { scope: "row-id" });
    expect(controller.isSelected(0, "row-id")).toBe(false);
    expect(controller.selected("row-id")).toHaveLength(count - 1);
    // Reconcile must keep the membership set in sync with the ordered list.
    controller.reconcileKeys(keys.slice(1, 100), { scope: "row-id" });
    expect(controller.isSelected(50, "row-id")).toBe(true);
    expect(controller.isSelected(0, "row-id")).toBe(false);
    expect(controller.isSelected(200, "row-id")).toBe(false);
  });

  it("isSelected treats NaN as a single membership key", () => {
    const controller = createPlotInteraction<number>();
    controller.setSelection([Number.NaN, 1], { scope: "row-id" });
    expect(controller.isSelected(Number.NaN, "row-id")).toBe(true);
    controller.toggleSelection(Number.NaN, { scope: "row-id" });
    expect(controller.isSelected(Number.NaN, "row-id")).toBe(false);
    expect(controller.selected("row-id")).toEqual([1]);
  });

  it("treats PropertyKey collections as sets even for opaque symbols", () => {
    const first = Symbol("same-description");
    const second = Symbol("same-description");
    const controller = createPlotInteraction<symbol>();
    controller.setSelection([second, first], { scope: "symbol-id" });
    expect(controller.setSelection([first, second], { scope: "symbol-id" })).toBeNull();
    controller.toggleSelection(first, { scope: "symbol-id" });
    expect(controller.selected("symbol-id")).toEqual([second]);
  });

  it("projects independently scoped data-space zoom and ignores unavailable channels", () => {
    const controller = createPlotInteraction<string>();
    expect(controller.setZoom({ x: [180, 210] }, { scope: { keys: "id" } })).toBeNull();
    expect(controller.revision).toBe(0);

    controller.setZoom({ x: [210, 180], y: [6000, 3000] }, { scope });
    expect(controller.zoom(scope)).toEqual({ x: [180, 210], y: [3000, 6000] });
    expect(controller.zoom({ keys: "other", x: "flipper-mm" })).toEqual({ x: [180, 210] });
    expect(controller.zoom({ keys: "penguin-id", x: "different", y: "body-mass-g" })).toEqual({
      y: [3000, 6000],
    });

    expect(controller.setZoom({ x: [180, 210], y: [3000, 6000] }, { scope })).toBeNull();
    expect(controller.revision).toBe(1);

    controller.setZoom({ x: [190, 200] }, { scope });
    expect(controller.zoom(scope)).toEqual({ x: [190, 200], y: [3000, 6000] });
    controller.resetZoom({ scope: { keys: "id", x: "flipper-mm" } });
    expect(controller.zoom(scope)).toEqual({ y: [3000, 6000] });
  });

  it("reconciles invalid key state explicitly and atomically", () => {
    const onchange = vi.fn((_transition: PlotInteractionTransition<string>): void => {});
    const controller = createPlotInteraction<string>({ onchange });
    controller.setSelection(["a", "b", "c"], { scope });
    controller.setEmphasis(["b", "c", "d"], { scope });
    onchange.mockClear();

    // Data replacement is inert until its owner explicitly reconciles.
    expect(controller.selected(scope)).toEqual(["a", "b", "c"]);
    expect(controller.emphasized(scope)).toEqual(["b", "c", "d"]);
    const transition = controller.reconcileKeys(["b", "d"], {
      scope,
      source: "programmatic",
    });

    expect(transition).toMatchObject({ kind: "reconcile", revision: 3 });
    expect(controller.selected(scope)).toEqual(["b"]);
    expect(controller.emphasized(scope)).toEqual(["b", "d"]);
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(transition!.changes).toEqual(["selection", "emphasis"]);

    expect(controller.reconcileKeys(["b", "d"], { scope })).toBeNull();
    expect(controller.revision).toBe(3);
  });

  it("prunes interval record keys during reconciliation", () => {
    const controller = createPlotInteraction<string>();
    controller.setInterval(
      {
        panelId: "panel:all",
        preset: "union",
        domains: { x: { kind: "linear", domain: [0, 10] } },
        keys: ["a", "b", "c"],
      },
      { scope },
    );

    const transition = controller.reconcileKeys(["b"], {
      scope,
      source: "programmatic",
    });

    expect(transition).toMatchObject({ kind: "reconcile" });
    expect(transition!.changes).toContain("interval");
    expect(controller.intervals(scope)[0]?.keys).toEqual(["b"]);
    expect(controller.snapshot.intervals[0]?.keys).toEqual(["b"]);
    expect(controller.reconcileKeys(["b"], { scope })).toBeNull();
  });

  it("publishes deterministic frozen snapshots without row or renderer state", () => {
    const controller = createPlotInteraction<string>();
    controller.setSelection(["z"], { scope: "z-scope" });
    controller.setSelection(["a"], { scope: "a-scope" });
    controller.setEmphasis(["e"], { scope: "z-scope" });
    controller.setZoom({ x: [1, 4] }, { scope: { keys: "id", x: "x-value" } });

    expect(controller.snapshot).toEqual({
      revision: 4,
      selections: [
        { scope: "a-scope", keys: ["a"] },
        { scope: "z-scope", keys: ["z"] },
      ],
      emphases: [{ scope: "z-scope", keys: ["e"] }],
      intervals: [],
      zoom: { x: [{ scope: "x-value", domain: [1, 4] }], y: [] },
    });
    expect(Object.isFrozen(controller.snapshot.selections)).toBe(true);
    expect(Object.isFrozen(controller.snapshot.intervals)).toBe(true);
    expect(Object.isFrozen(controller.snapshot.selections[0])).toBe(true);
    expect(Object.isFrozen(controller.snapshot.selections[0]?.keys)).toBe(true);
    expect(JSON.stringify(controller.snapshot)).not.toMatch(/row|candidate|pixel|renderer|node/i);
  });

  it("rejects invalid runtime keys and non-finite domains without transitions", () => {
    const controller = createPlotInteraction();
    expect(() => controller.setSelection([fromAny<PropertyKey>({})], { scope: "id" })).toThrow(
      TypeError,
    );
    expect(() =>
      controller.setZoom({ x: [0, Number.NaN] }, { scope: { keys: "id", x: "x" } }),
    ).toThrow(TypeError);
    expect(controller.revision).toBe(0);
  });
});
