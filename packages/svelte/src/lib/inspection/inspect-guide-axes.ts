import type { ResolvedInspectMode } from "../interaction/interaction.js";

export type InspectGuideAxes = {
  readonly vertical: boolean;
  readonly horizontal: boolean;
};

/**
 * Which screen-space crosshairs an inspect mode paints.
 * `coord_flip` swaps x/y guides; exact paints none; xy paints both.
 */
export function inspectGuideAxes(mode: ResolvedInspectMode, flipped: boolean): InspectGuideAxes {
  switch (mode) {
    case "exact":
      return { vertical: false, horizontal: false };
    case "xy":
      return { vertical: true, horizontal: true };
    case "x":
      return flipped
        ? { vertical: false, horizontal: true }
        : { vertical: true, horizontal: false };
    case "y":
      return flipped
        ? { vertical: true, horizontal: false }
        : { vertical: false, horizontal: true };
  }
}
