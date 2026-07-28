/**
 * Vertical placement helper for right-edge legends.
 * Shared by panel layout (fit check) and scene legend placement — neither owns the other.
 */

export function containedRightLegendY(input: {
  legends: readonly { position?: string; y: number; height: number }[];
  panelY: number;
  minimumY: number;
  sceneHeight: number;
  bottomInset: number;
}): number {
  const rightExtent = input.legends.reduce(
    (extent, legend) =>
      legend.position === "right" ? Math.max(extent, legend.y + legend.height) : extent,
    0,
  );
  if (rightExtent === 0) return input.panelY;
  return Math.max(
    input.minimumY,
    Math.min(input.panelY, input.sceneHeight - input.bottomInset - rightExtent),
  );
}
