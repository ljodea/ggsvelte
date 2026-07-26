/** Deterministic semantic legend construction and responsive right/bottom planning. */
import type { TextMeasurer } from "./layout/measure.js";
import {
  BLOCK_GAP,
  buildForPosition,
  type LegendBlock,
  type LegendInput,
  type LegendOrder,
  LegendLayoutError,
} from "./legend-build.js";

export type {
  DiscreteLegendInput,
  LegendBlock,
  LegendInput,
  LegendOrder,
  RampLegendInput,
  ResolvedLegendAppearance,
  StepsLegendInput,
} from "./legend-build.js";
export { disambiguatedLabels, LEGEND_ROW_HEIGHT, LegendLayoutError } from "./legend-build.js";

const MIN_READABLE_PANEL = 320;
const ESTIMATED_NON_LEGEND_CHROME = 80;
const AUTO_BOTTOM_MAX_WIDTH = 480;

function resolvePosition(input: LegendInput, autoBottom: boolean): "right" | "bottom" {
  const authored = input.appearance?.position;
  return authored === "right" || authored === "bottom" ? authored : autoBottom ? "bottom" : "right";
}

export function assertLegendBlockFitsPlacedArea(input: {
  block: LegendBlock;
  inputs: readonly LegendInput[];
  viewportHeight: number;
  rightTop: number;
  bottomInset: number;
}): void {
  const rightExtent = input.rightTop + input.block.height;
  const bottomExtent = input.bottomInset + input.block.bottomHeight;
  for (const [position, extent] of [
    ["right", rightExtent],
    ["bottom", bottomExtent],
  ] as const) {
    if (extent <= input.viewportHeight) continue;
    const overflowing = input.block.legends.find(
      (legend) =>
        legend.position === position &&
        input.inputs.find((candidate) => candidate.scale === legend.scale)?.appearance
          ?.collision === "error",
    );
    if (overflowing === undefined) continue;
    throw new LegendLayoutError(
      overflowing.scale,
      overflowing.title,
      `The ${overflowing.scale} guide needs ${String(Math.ceil(extent))}px after placement but the viewport is ${String(Math.floor(input.viewportHeight))}px tall.`,
      "Increase the chart height, reduce the visible categories, or suppress this guide.",
    );
  }
}

export function buildLegends(
  inputs: readonly LegendInput[],
  order: LegendOrder,
  measurer: TextMeasurer,
  maxWidth: number,
  viewportWidth?: number,
  viewportHeight = Number.POSITIVE_INFINITY,
): LegendBlock {
  const resolvedViewportWidth = viewportWidth ?? maxWidth / 0.35;
  let autoBottom = viewportWidth !== undefined && resolvedViewportWidth <= AUTO_BOTTOM_MAX_WIDTH;
  const build = () =>
    inputs.map((input) => {
      const position = resolvePosition(input, autoBottom);
      const available =
        position === "bottom"
          ? Math.max(48, resolvedViewportWidth - ESTIMATED_NON_LEGEND_CHROME)
          : maxWidth;
      return buildForPosition(input, order, measurer, available, position);
    });
  let legends = build();
  const tentativeRightWidth = Math.max(
    0,
    ...legends.filter((legend) => legend.position === "right").map((legend) => legend.width),
  );
  if (
    viewportWidth !== undefined &&
    !autoBottom &&
    resolvedViewportWidth - tentativeRightWidth - ESTIMATED_NON_LEGEND_CHROME < MIN_READABLE_PANEL
  ) {
    autoBottom = true;
    legends = build();
  }

  let rightY = 0;
  let bottomY = 0;
  let rightWidth = 0;
  let previousRightGap = 0;
  let previousBottomGap = 0;
  for (const legend of legends) {
    const gap =
      inputs.find((input) => input.scale === legend.scale)?.appearance?.theme?.blockGap ??
      BLOCK_GAP;
    if (legend.position === "right") {
      if (rightY > 0) rightY += previousRightGap;
      legend.y = rightY;
      rightY += legend.height;
      previousRightGap = gap;
      rightWidth = Math.max(rightWidth, legend.width);
    } else {
      if (bottomY > 0) bottomY += previousBottomGap;
      legend.y = bottomY;
      bottomY += legend.height;
      previousBottomGap = gap;
    }
  }
  for (const [position, extent] of [
    ["right", rightY],
    ["bottom", bottomY],
  ] as const) {
    if (extent <= viewportHeight) continue;
    const overflowing = legends.find(
      (legend) =>
        legend.position === position &&
        inputs.find((input) => input.scale === legend.scale)?.appearance?.collision === "error",
    );
    if (overflowing === undefined) continue;
    throw new LegendLayoutError(
      overflowing.scale,
      overflowing.title,
      `The ${overflowing.scale} guide needs ${String(Math.ceil(extent))}px but the viewport is ${String(Math.floor(viewportHeight))}px tall.`,
      "Increase the chart height, reduce the visible categories, or suppress this guide.",
    );
  }
  return {
    legends,
    width: rightWidth,
    height: rightY,
    bottomHeight: bottomY,
    autoMovedBottom:
      autoBottom &&
      inputs.some(
        (input) => input.appearance?.position === undefined || input.appearance.position === "auto",
      ),
  };
}
