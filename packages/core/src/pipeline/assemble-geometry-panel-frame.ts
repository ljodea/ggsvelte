/**
 * Build the geometry Frame for one facet panel (optional coord flip extents).
 */
import type { PanelCoordProjector, CoordAxisProjector } from "../coord-projector.js";
import type { PositionScale } from "../scales/train.js";

import type { Frame } from "./geometry.js";
import type { PanelPlacement } from "./panel-layout.js";

function projectedPositionScale(
  scale: PositionScale,
  projector: CoordAxisProjector,
): PositionScale {
  if (!projector.active) return scale;
  if (scale.type === "band") {
    return {
      ...scale,
      normalize(value: unknown) {
        const fraction = scale.normalize(value);
        return fraction === undefined ? undefined : projector.projectFraction(fraction);
      },
    };
  }
  return {
    ...scale,
    normalize(value: number) {
      return projector.projectFraction(scale.normalize(value));
    },
    normalizeTransformed(value: number) {
      return projector.projectFraction(scale.normalizeTransformed(value));
    },
  };
}

export function geometryPanelFrame(
  placement: PanelPlacement,
  scales: { x: PositionScale; y: PositionScale },
  flip: boolean,
  coordProjector?: PanelCoordProjector,
): Frame {
  const projectedScales =
    coordProjector === undefined
      ? scales
      : {
          x: projectedPositionScale(scales.x, coordProjector.x),
          y: projectedPositionScale(scales.y, coordProjector.y),
        };
  return flip
    ? {
        innerWidth: placement.height,
        innerHeight: placement.width,
        xScale: projectedScales.x,
        yScale: projectedScales.y,
      }
    : {
        innerWidth: placement.width,
        innerHeight: placement.height,
        xScale: projectedScales.x,
        yScale: projectedScales.y,
      };
}
