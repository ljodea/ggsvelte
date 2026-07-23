/**
 * Interaction transition owner — observable transition routing through the port.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { bindInteractionTransitionPort } from "../../src/lib/interaction/transition-port.js";
import { createInteractionReducer } from "../../src/lib/interaction/reducer.js";
import { createInspectionState } from "../../src/lib/inspection/inspection-state.svelte.js";
import { candidateHit, continuousSpec, modelFor } from "../inspection/inspection-state.harness.js";
import { withFlushedEffectRoot } from "../helpers/effect-root.svelte.js";

describe("InteractionTransitionPort", () => {
  it("routes dismiss inspection to clear brush and return to inspect through one port", () => {
    const model = modelFor(continuousSpec());
    let brushCleared = 0;
    let chooseToolCalls: string[] = [];
    const wiring: Parameters<typeof bindInteractionTransitionPort>[0] = {};
    const port = bindInteractionTransitionPort(wiring);

    const reducer = createInteractionReducer();
    wiring.surface = {
      reducer,
      activeTool: "select-area",
      clearBrush: () => {
        brushCleared++;
      },
      chooseTool: (tool) => {
        chooseToolCalls.push(tool);
      },
      clearTouchInspectStart: () => {},
    };

    const { value: inspection, destroy } = withFlushedEffectRoot(() =>
      createInspectionState({
        model: () => model,
        port,
        inspectConfig: () => ({ pin: true }),
        inspectEnabled: () => true,
        dataIdentityEpoch: () => "epoch-1",
        keyAt: () => null,
        root: () => null,
        captureSurface: () => null,
        plotId: () => "plot-test",
        tooltipHovered: () => false,
        clearTooltipHovered: () => {},
        oninspect: () => {},
        oninteraction: () => {},
        announce: () => {},
        clearAnnouncement: () => {},
      }),
    );
    wiring.inspection = inspection;

    const { candidate, hit } = candidateHit(model);
    inspection.setInspection(hit, "pointer", "pinned", "xy", candidate);
    flushSync();

    inspection.dismissInspection("escape", "keyboard", { returnToInspect: true });
    flushSync();

    expect(inspection.inspection).toBeNull();
    expect(brushCleared).toBe(1);
    expect(chooseToolCalls).toEqual(["inspect"]);

    destroy();
  });
});
