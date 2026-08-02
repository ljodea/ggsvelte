/**
 * createInteractionStates tests — bundle shape, construction laziness, and
 * sibling-port wiring through the assembly (interval → selection emit).
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { PlotInteractionEvent, PlotSelection } from "../../src/lib/interaction/interaction.js";
import { createInteractionStates } from "../../src/lib/interaction/interaction-states.svelte.js";
import { withFlushedEffectRoot } from "../helpers/effect-root.svelte.js";
import { testInteractionContext } from "../helpers/interaction-context.js";
import { modelFor } from "../helpers/model.js";
import {
  brushEvent,
  continuousSpec,
  persistentSelect,
} from "../interval/interval-state.harness.js";

function mountAssembly(
  overrides: {
    oninteraction?: (event: PlotInteractionEvent) => void;
    onselect?: (event: PlotSelection) => void;
    announce?: (message: string) => void;
  } = {},
) {
  const spec = continuousSpec();
  const model = modelFor(spec);
  return withFlushedEffectRoot(() =>
    createInteractionStates(
      testInteractionContext({
        model: () => model,
        resolvedInteractionScope: () => ({ keys: "plot", x: "x", y: "y", intervals: "plot" }),
        selectConfig: persistentSelect,
        oninteraction: () => overrides.oninteraction,
        onselect: () => overrides.onselect,
        announce: overrides.announce ?? (() => {}),
      }),
      {
        zoom: {
          zoomConfig: () => null,
          assembled: () => spec,
        },
        interval: {
          consumptionCandidates: () => [],
        },
        surface: {
          toolProp: () => {
            /* uncontrolled */
          },
          initialTool: () => "inspect",
          availableTools: () => [],
          pointSelectEnabled: () => false,
          surfaceInteractive: () => false,
        },
        inspection: {
          inspectEnabled: () => false,
          dataIdentityEpoch: () => "epoch-1",
          plotId: () => "plot-test",
          clearTooltipHovered: () => {},
          clearAnnouncement: () => {},
        },
      },
    ),
  );
}

describe("createInteractionStates construction", () => {
  it("builds all five controllers without invoking announce/handler sinks", () => {
    const announcements: string[] = [];
    const interactions: PlotInteractionEvent[] = [];

    const { value: states, destroy } = mountAssembly({
      announce: (message) => announcements.push(message),
      oninteraction: (event) => interactions.push(event),
    });

    expect(states.zoom).toBeDefined();
    expect(states.selection).toBeDefined();
    expect(states.interval).toBeDefined();
    expect(states.surface).toBeDefined();
    expect(states.inspection).toBeDefined();
    // Shared reducer is a concrete instance hoisted by the assembly — the
    // surface↔inspection late binding is gone.
    expect(states.surface.reducer).toBeDefined();

    expect(announcements).toEqual([]);
    expect(interactions).toEqual([]);

    destroy();
  });
});

describe("createInteractionStates sibling ports", () => {
  it("wires interval finish → selection emit through the real controllers", () => {
    const interactions: PlotInteractionEvent[] = [];
    const selections: PlotSelection[] = [];

    const { value: states, destroy } = mountAssembly({
      oninteraction: (event) => interactions.push(event),
      onselect: (event) => selections.push(event),
    });
    const model = modelFor(continuousSpec());

    states.interval.finishBrushSelect(brushEvent(model), "pointer");
    flushSync();

    expect(states.interval.committedInterval).not.toBeNull();
    // The assembly wires interval's emitSelection to the real selection
    // controller, which emits on both sinks.
    expect(selections).toHaveLength(1);
    expect(selections[0]?.mode).not.toBe("point");
    expect(interactions.length).toBeGreaterThan(0);

    destroy();
  });

  it("wires selection toggles to the interaction sinks", () => {
    const interactions: PlotInteractionEvent[] = [];
    const selections: PlotSelection[] = [];

    const { value: states, destroy } = mountAssembly({
      oninteraction: (event) => interactions.push(event),
      onselect: (event) => selections.push(event),
    });

    states.selection.togglePointKeys(["a"], "pointer");
    flushSync();

    expect(states.selection.effectiveSelectedKeys).toEqual(["a"]);
    expect(selections).toHaveLength(1);
    expect(interactions.length).toBeGreaterThan(0);

    destroy();
  });
});
