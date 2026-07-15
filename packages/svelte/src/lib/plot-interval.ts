import type { CellValue } from "@ggsvelte/core";

import type {
  InteractionSource,
  IntervalSelection,
} from "./interaction.js";
import type { PlotRect } from "./plot-geometry.js";

/** Pointer brush-end gate only. Keyboard Enter/Space commits any size. */
export const BRUSH_MIN_SPAN_PX = 4;

export type SelectAreaMode = "x" | "y" | "xy";

export type IntervalDomain = {
  readonly x?: readonly [CellValue, CellValue];
  readonly y?: readonly [CellValue, CellValue];
};

/**
 * Pointer brush-end degeneracy: BOTH spans must be strictly less than min.
 * Input must already be normalized (x0≤x1, y0≤y1); this does not take abs.
 */
export function isBrushTooSmall(
  rect: PlotRect,
  minPx: number = BRUSH_MIN_SPAN_PX,
): boolean {
  return rect.x1 - rect.x0 < minPx && rect.y1 - rect.y0 < minPx;
}

/** Drop domain axes not requested by the interval select mode. */
export function filterDomainBySelectMode(
  domain: IntervalDomain,
  mode: SelectAreaMode,
): IntervalDomain {
  return {
    ...(mode !== "y" && domain.x !== undefined && { x: domain.x }),
    ...(mode !== "x" && domain.y !== undefined && { y: domain.y }),
  };
}

/** Freeze an interval domain bag (nested tuples when present). */
export function freezeIntervalDomain(
  domain: IntervalDomain,
): IntervalSelection["domain"] {
  return Object.freeze({
    ...(domain.x !== undefined && {
      x: Object.freeze([...domain.x]) as [CellValue, CellValue],
    }),
    ...(domain.y !== undefined && {
      y: Object.freeze([...domain.y]) as [CellValue, CellValue],
    }),
  });
}

export type BuildIntervalSelectionInput = {
  readonly phase: IntervalSelection["phase"];
  readonly mode: SelectAreaMode;
  readonly panelId: string | null;
  readonly domain: IntervalDomain;
  readonly pixels: PlotRect;
  readonly keys: readonly PropertyKey[];
  readonly lineageCount: number;
  readonly source: InteractionSource;
};

/** Build a frozen IntervalSelection event payload. */
export function buildIntervalSelection(
  input: BuildIntervalSelectionInput,
): IntervalSelection {
  return Object.freeze({
    type: "select",
    phase: input.phase,
    mode: input.mode,
    panelId: input.panelId,
    domain: freezeIntervalDomain(input.domain),
    pixels: Object.freeze({ ...input.pixels }),
    keys: Object.freeze([...input.keys]),
    lineageCount: input.lineageCount,
    source: input.source,
  });
}

/**
 * Clear event for a committed interval: preserves mode/panelId/pixels,
 * empties domain/keys, lineageCount 0.
 */
export function clearIntervalSelectionEvent(
  previous: Pick<IntervalSelection, "mode" | "panelId" | "pixels">,
  source: InteractionSource,
): IntervalSelection {
  return Object.freeze({
    type: "select",
    phase: "clear",
    mode: previous.mode,
    panelId: previous.panelId,
    domain: Object.freeze({}),
    pixels: Object.freeze({ ...previous.pixels }),
    keys: Object.freeze([]),
    lineageCount: 0,
    source,
  });
}
