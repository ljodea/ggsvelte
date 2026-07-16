/**
 * Build the geometry Frame for one facet panel (optional coord flip extents).
 */
import type { PositionScale } from "../scales/train.js";

import type { Frame } from "./geometry.js";
import type { PanelPlacement } from "./panel-layout.js";

export function geometryPanelFrame(
  placement: PanelPlacement,
  scales: { x: PositionScale; y: PositionScale },
  flip: boolean,
): Frame {
  return flip
    ? {
        innerWidth: placement.height,
        innerHeight: placement.width,
        xScale: scales.x,
        yScale: scales.y,
      }
    : {
        innerWidth: placement.width,
        innerHeight: placement.height,
        xScale: scales.x,
        yScale: scales.y,
      };
}
