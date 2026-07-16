/**
 * Effective and baseline scale domain snapshots for a pipeline run.
 */
import type { PositionScale } from "../scales/train.js";

import type { FacetPanelDef } from "./facets.js";
import { scaleDomainSnapshot } from "./layout-helpers.js";
import { collectAxisInputs, trainAxis } from "./scale-training.js";
import type { Advisory, LayerFrame, ScaleDomainSnapshot } from "./types.js";
import type { RunOptions } from "./types.js";

export function computeEffectiveDomains(
  xScale: PositionScale,
  yScale: PositionScale,
  panelScales: readonly { x: PositionScale; y: PositionScale }[],
): ScaleDomainSnapshot {
  return Object.freeze({
    x: scaleDomainSnapshot(xScale),
    y: scaleDomainSnapshot(yScale),
    panels: Object.freeze(
      panelScales.map((panel) =>
        Object.freeze({ x: scaleDomainSnapshot(panel.x), y: scaleDomainSnapshot(panel.y) }),
      ),
    ),
  });
}

export function computeBaselineDomains(input: {
  options: RunOptions;
  freeX: boolean;
  freeY: boolean;
  facetPanels: readonly FacetPanelDef[];
  panelFrames: readonly (readonly LayerFrame[])[];
  xInputs: ReturnType<typeof collectAxisInputs>;
  yInputs: ReturnType<typeof collectAxisInputs>;
  effectiveDomains: ScaleDomainSnapshot;
}): ScaleDomainSnapshot {
  const { options, freeX, freeY, facetPanels, panelFrames, xInputs, yInputs, effectiveDomains } =
    input;

  if (options.baselineDomains !== undefined) return options.baselineDomains;
  if (options.baselineScales === undefined) return effectiveDomains;

  const baselineX = trainAxis("x", xInputs, options.baselineScales.x).scale;
  const baselineY = trainAxis("y", yInputs, options.baselineScales.y).scale;
  const baselinePanels = facetPanels.map((_, panelIndex) => {
    let x = baselineX;
    let y = baselineY;
    const scratch: Advisory[] = [];
    if (freeX) {
      const inputs = collectAxisInputs(
        "x",
        panelFrames[panelIndex]!,
        options.baselineScales?.x?.type,
        scratch,
      );
      x = trainAxis("x", inputs, {
        ...options.baselineScales?.x,
        type: baselineX.type,
      }).scale;
    }
    if (freeY) {
      const inputs = collectAxisInputs(
        "y",
        panelFrames[panelIndex]!,
        options.baselineScales?.y?.type,
        scratch,
      );
      y = trainAxis("y", inputs, {
        ...options.baselineScales?.y,
        type: baselineY.type,
      }).scale;
    }
    return Object.freeze({ x: scaleDomainSnapshot(x), y: scaleDomainSnapshot(y) });
  });
  return Object.freeze({
    x: scaleDomainSnapshot(baselineX),
    y: scaleDomainSnapshot(baselineY),
    panels: Object.freeze(baselinePanels),
  });
}
