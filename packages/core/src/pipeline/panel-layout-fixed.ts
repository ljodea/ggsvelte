import type { CoordFixedSpec, Scales } from "@ggsvelte/spec";

import type { PositionScale } from "../scales/train.js";

import type { PanelPlacement } from "./panel-layout-types.js";
import { PipelineError, type PipelineWarning } from "./types.js";

const MIN_READABLE_FIXED_PANEL_PX = 64;

function scaleSpaceSpan(scale: PositionScale): number {
  if (scale.type === "band") return Math.max(1, scale.rawDomain.length);
  const span = Math.abs(scale.transformedDomain[1] - scale.transformedDomain[0]);
  return Number.isFinite(span) && span > 0 ? span : 1;
}

function fitAutomaticTicks<T>(ticks: readonly T[], fraction: number, degraded: boolean): T[] {
  const target = Math.max(
    Math.min(2, ticks.length),
    Math.min(ticks.length, degraded ? 3 : Math.floor(ticks.length * fraction)),
  );
  if (target >= ticks.length) return [...ticks];
  return Array.from({ length: target }, (_, index) => {
    const sourceIndex = Math.round((index * (ticks.length - 1)) / Math.max(1, target - 1));
    return ticks[sourceIndex]!;
  });
}

export interface FixedAspectLayoutResult {
  placements: PanelPlacement[];
  degraded: boolean;
}

/**
 * Fit equal fixed-aspect data rectangles inside already-reserved panel allocations.
 * Chart chrome is therefore authoritative; this pass can only add paper gutters.
 */
export function applyFixedAspectLayout(input: {
  placements: readonly PanelPlacement[];
  panelScales: readonly { x: PositionScale; y: PositionScale }[];
  coord: CoordFixedSpec;
  faceted: boolean;
  freeX: boolean;
  freeY: boolean;
  scalesConfig: Scales;
  warnings: PipelineWarning[];
}): FixedAspectLayoutResult {
  if (input.freeX || input.freeY) {
    const cause =
      "Fixed-aspect coordinates cannot assign one truthful physical data-unit ratio across free positional facet scales.";
    throw new PipelineError("coord-fixed-free-scales", "/facet/scales", cause, {
      code: "coord-fixed-free-scales",
      severity: "error",
      path: "/facet/scales",
      problem: "coord_fixed is incompatible with free positional facet scales.",
      cause,
      fixes: [
        { description: 'Use facet.scales = "fixed".' },
        { description: "Remove the fixed-aspect coordinate." },
      ],
      documentationUrl: "/guide/coordinate-systems#fixed-aspect",
    });
  }
  if (input.placements.length === 0) return { placements: [], degraded: false };

  const ratio = input.coord.ratio ?? 1;
  const firstScales = input.panelScales[0];
  if (firstScales === undefined) return { placements: [...input.placements], degraded: false };
  const targetAspect = ratio * (scaleSpaceSpan(firstScales.y) / scaleSpaceSpan(firstScales.x));

  // Fixed-scale facets promise equal data rectangles. Use the common largest
  // rectangle that fits every already-computed panel allocation.
  const availableWidth = input.faceted
    ? Math.min(...input.placements.map((placement) => placement.width))
    : input.placements[0]!.width;
  const availableHeight = input.faceted
    ? Math.min(...input.placements.map((placement) => placement.height))
    : input.placements[0]!.height;
  const availableAspect = availableHeight / availableWidth;
  const fittedWidth =
    availableAspect > targetAspect ? availableWidth : availableHeight / targetAspect;
  const fittedHeight =
    availableAspect > targetAspect ? availableWidth * targetAspect : availableHeight;
  const degraded =
    fittedWidth < MIN_READABLE_FIXED_PANEL_PX || fittedHeight < MIN_READABLE_FIXED_PANEL_PX;

  const placements = input.placements.map((placement) => {
    const allocation = {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
    };
    return {
      ...placement,
      x: allocation.x + (allocation.width - fittedWidth) / 2,
      y: allocation.y + (allocation.height - fittedHeight) / 2,
      width: fittedWidth,
      height: fittedHeight,
      allocation,
      ...(input.scalesConfig.x?.breaks === undefined &&
      input.scalesConfig.x?.dateBreaks === undefined
        ? {
            ticksH: fitAutomaticTicks(placement.ticksH, fittedWidth / allocation.width, degraded),
          }
        : {}),
      ...(input.scalesConfig.y?.breaks === undefined &&
      input.scalesConfig.y?.dateBreaks === undefined
        ? {
            ticksV: fitAutomaticTicks(placement.ticksV, fittedHeight / allocation.height, degraded),
          }
        : {}),
    };
  });

  if (degraded) {
    const factor = MIN_READABLE_FIXED_PANEL_PX / Math.min(fittedWidth, fittedHeight);
    input.warnings.push({
      code: "coord-fixed-degraded",
      message:
        `The fixed-aspect data rectangle is ${fittedWidth.toFixed(1)}×${fittedHeight.toFixed(1)} px, below the ${MIN_READABLE_FIXED_PANEL_PX} px readable minimum. ` +
        `The ratio is preserved and minor furniture is removed; an allocation of about ${Math.ceil(availableWidth * factor)}×${Math.ceil(availableHeight * factor)} px would satisfy the minimum.`,
    });
  }
  return { placements, degraded };
}
