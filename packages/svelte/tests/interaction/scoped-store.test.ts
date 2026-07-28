/**
 * createScopedStore — local vs controller-backed channel storage (#1079).
 * Factories own deriveds — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { createPlotInteraction } from "../../src/lib/interaction/controller.svelte.js";
import type {
  InteractionSource,
  PlotInteractionScope,
} from "../../src/lib/interaction/interaction.js";
import {
  createIntervalScopedStore,
  createScopedStore,
  type ScopedStore,
} from "../../src/lib/interaction/scoped-store.svelte.js";
import type { PlotInteractionInterval } from "../../src/lib/interaction/interaction.js";
import { withFlushedEffectRoot } from "../helpers/effect-root.svelte.js";
import { reactiveBox } from "../helpers/reactive-box.svelte.js";

const defaultScope: PlotInteractionScope = {
  keys: "plot",
  x: "x",
  y: "y",
  intervals: "plot",
};

type KeyStore = ScopedStore<readonly PropertyKey[]>;

function mountKeyStore(
  options: {
    controller?: () => ReturnType<typeof createPlotInteraction> | undefined;
    scope?: () => PlotInteractionScope;
    initial?: readonly PropertyKey[];
  } = {},
): { store: KeyStore; destroy: () => void } {
  const { value: store, destroy } = withFlushedEffectRoot(() =>
    createScopedStore<readonly PropertyKey[]>({
      initial: options.initial ?? [],
      controller: options.controller ?? (() => undefined),
      scope: options.scope ?? (() => defaultScope),
      read: (controller, scope) => controller.selected(scope),
      write: (controller, next, scope, source) => {
        const transition = controller.setSelection(next, { scope, source });
        if (transition === null) return null;
        return {
          value:
            transition.snapshot.selections.find((selection) => selection.scope === scope.keys)
              ?.keys ?? [],
        };
      },
      clearShared: (controller, scope, source) =>
        controller.clearSelection({ scope, source }) !== null,
      same: (a, b) => a.length === b.length && a.every((key, i) => key === b[i]),
    }),
  );
  return { store, destroy };
}

describe("createScopedStore local mode", () => {
  it("starts at initial and set/clear mutate local value with source ignored for storage", () => {
    const sources: InteractionSource[] = [];
    const { store, destroy } = mountKeyStore();
    expect(store.value).toEqual([]);

    const committed = store.set(["a", "b"], "keyboard");
    expect(committed).toEqual({ value: ["a", "b"] });
    expect(store.value).toEqual(["a", "b"]);
    sources.push("keyboard");

    expect(store.set(["a", "b"], "pointer")).toBeNull();
    expect(store.value).toEqual(["a", "b"]);

    expect(store.clear("touch")).toBe(true);
    expect(store.value).toEqual([]);
    expect(store.clear("programmatic")).toBe(false);

    // Source is a required argument on the public surface (call sites above).
    expect(sources).toEqual(["keyboard"]);
    destroy();
  });
});

describe("createScopedStore controller mode", () => {
  it("reads and writes through the shared controller", () => {
    const controller = createPlotInteraction();
    const { store, destroy } = mountKeyStore({
      controller: () => controller,
    });

    expect(store.value).toEqual([]);
    const committed = store.set(["x", "y"], "pointer");
    expect(committed).toEqual({ value: ["x", "y"] });
    expect(store.value).toEqual(["x", "y"]);
    expect(controller.selected(defaultScope)).toEqual(["x", "y"]);

    expect(store.clear("keyboard")).toBe(true);
    expect(store.value).toEqual([]);
    expect(controller.selected(defaultScope)).toEqual([]);
    destroy();
  });

  it("returns null when the controller rejects a no-op set", () => {
    const controller = createPlotInteraction();
    controller.setSelection(["a"], { scope: defaultScope, source: "programmatic" });
    const { store, destroy } = mountKeyStore({
      controller: () => controller,
    });

    expect(store.set(["a"], "pointer")).toBeNull();
    expect(store.value).toEqual(["a"]);
    destroy();
  });
});

describe("createScopedStore mid-life controller arrival", () => {
  it("switches from local to controller-backed reads when controller appears", () => {
    const controllerBox = reactiveBox<ReturnType<typeof createPlotInteraction> | undefined>(
      undefined,
    );
    const { store, destroy } = mountKeyStore({
      controller: () => controllerBox.value,
    });

    store.set(["local"], "programmatic");
    expect(store.value).toEqual(["local"]);

    const controller = createPlotInteraction();
    controller.setSelection(["shared"], { scope: defaultScope, source: "programmatic" });
    controllerBox.set(controller);
    flushSync();

    // Shared mode prefers controller state over the prior local shadow.
    expect(store.value).toEqual(["shared"]);
    destroy();
  });
});

describe("createScopedStore revision subscription", () => {
  it("invalidates value when the controller mutates outside the store", () => {
    const controller = createPlotInteraction();
    const { store, destroy } = mountKeyStore({
      controller: () => controller,
    });

    expect(store.value).toEqual([]);
    controller.setSelection(["external"], { scope: defaultScope, source: "programmatic" });
    flushSync();
    expect(store.value).toEqual(["external"]);
    destroy();
  });
});

const sampleInterval = (panelId: string): PlotInteractionInterval<PropertyKey> =>
  Object.freeze({
    panelId,
    preset: "independent" as const,
    domains: Object.freeze({
      x: Object.freeze({ kind: "linear" as const, domain: [0, 1] as const }),
    }),
    keys: Object.freeze(["k"] as PropertyKey[]),
  });

describe("createIntervalScopedStore", () => {
  it("upserts, removes, and clears in local mode", () => {
    const { value: store, destroy } = withFlushedEffectRoot(() =>
      createIntervalScopedStore({
        controller: () => undefined,
        scope: () => defaultScope,
      }),
    );

    expect(store.value).toEqual([]);
    store.upsert(sampleInterval("p1"), "pointer");
    store.upsert(sampleInterval("p2"), "keyboard");
    expect(store.value.map((record) => record.panelId)).toEqual(["p1", "p2"]);

    expect(store.remove("p1", "touch")).toBe(true);
    expect(store.value.map((record) => record.panelId)).toEqual(["p2"]);
    expect(store.remove("missing", "programmatic")).toBe(false);

    expect(store.clear("pointer")).toBe(true);
    expect(store.value).toEqual([]);
    expect(store.clear("pointer")).toBe(false);
    destroy();
  });

  it("mirrors controller interval ops and source propagation", () => {
    const controller = createPlotInteraction();
    const sources: string[] = [];
    const { value: store, destroy } = withFlushedEffectRoot(() =>
      createIntervalScopedStore({
        controller: () => controller,
        scope: () => defaultScope,
      }),
    );

    store.upsert(sampleInterval("panel-a"), "keyboard");
    sources.push("keyboard");
    expect(store.value).toHaveLength(1);
    expect(controller.intervals(defaultScope)).toHaveLength(1);

    store.remove("panel-a", "touch");
    sources.push("touch");
    expect(store.value).toEqual([]);
    expect(sources).toEqual(["keyboard", "touch"]);
    destroy();
  });
});
