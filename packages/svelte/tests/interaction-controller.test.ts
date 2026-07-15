import { describe, expect, it, vi } from "vitest";

import { createPlotInteraction } from "../src/lib/interaction-controller.svelte.js";
import type { PlotInteractionTransition } from "../src/lib/interaction.js";

const scope = {
  keys: "penguin-id",
  x: "flipper-mm",
  y: "body-mass-g",
} as const;

describe("createPlotInteraction", () => {
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
      zoom: { x: [{ scope: "x-value", domain: [1, 4] }], y: [] },
    });
    expect(Object.isFrozen(controller.snapshot.selections)).toBe(true);
    expect(Object.isFrozen(controller.snapshot.selections[0])).toBe(true);
    expect(Object.isFrozen(controller.snapshot.selections[0]?.keys)).toBe(true);
    expect(JSON.stringify(controller.snapshot)).not.toMatch(/row|candidate|pixel|renderer|node/i);
  });

  it("rejects invalid runtime keys and non-finite domains without transitions", () => {
    const controller = createPlotInteraction();
    expect(() => controller.setSelection([{} as unknown as PropertyKey], { scope: "id" })).toThrow(
      TypeError,
    );
    expect(() =>
      controller.setZoom({ x: [0, Number.NaN] }, { scope: { keys: "id", x: "x" } }),
    ).toThrow(TypeError);
    expect(controller.revision).toBe(0);
  });
});
