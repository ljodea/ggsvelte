/**
 * Build ScenePanel[] and shared axis ticks from placements.
 */
import type { PanelCoordProjector } from "../coord-projector.js";
import { FONT_METRICS } from "../layout/font-metrics.js";
import { MetricsTableMeasurer, type TextMeasurer } from "../layout/measure.js";
import type { SceneAxis, ScenePanel, SceneTick } from "../scene.js";
import type { PositionScale } from "../scales/train.js";

import type { FacetPanelDef } from "./facets.js";
import { axisTicks } from "./layout-helpers.js";
import type { PanelPlacement } from "./panel-layout.js";

const PROJECTED_LABEL_GAP_PX = 4;

function suppressProjectedLabelOverlap(
  ticks: readonly SceneTick[],
  orientation: "horizontal" | "vertical",
  measurer: TextMeasurer,
  fontSize: number,
): SceneTick[] {
  const output = ticks.map((tick) => ({ ...tick }));
  const labeled = output
    .filter((tick) => tick.label !== "")
    .toSorted((a, b) => (orientation === "horizontal" ? b.pos - a.pos : a.pos - b.pos));
  let boundary = orientation === "horizontal" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  for (const tick of labeled) {
    const half =
      orientation === "horizontal"
        ? measurer.measureWidth(tick.label, fontSize) / 2
        : measurer.measureHeight(fontSize) / 2;
    const fits =
      orientation === "horizontal"
        ? tick.pos + half <= boundary - PROJECTED_LABEL_GAP_PX
        : tick.pos - half >= boundary + PROJECTED_LABEL_GAP_PX;
    if (!fits) {
      tick.label = "";
      continue;
    }
    boundary = orientation === "horizontal" ? tick.pos - half : tick.pos + half;
  }
  return output;
}

function numericMinorTicks(
  scale: PositionScale,
  values: readonly number[] | undefined,
  major: readonly SceneTick[],
  extent: number,
  fromEnd: boolean,
): SceneTick[] {
  if (values === undefined || scale.type !== "linear") return [];
  const majorValues = new Set(
    major.filter((tick) => tick.kind === "major").map((tick) => tick.value),
  );
  const unique = [
    ...new Set(
      values.filter((value) => {
        const normalized = scale.normalize(value);
        return (
          Number.isFinite(value) &&
          Number.isFinite(normalized) &&
          normalized >= 0 &&
          normalized <= 1 &&
          !majorValues.has(value)
        );
      }),
    ),
  ];
  return axisTicks(
    scale,
    unique.map((value) => ({ value, label: "", kind: "minor" as const, labeled: false })),
    extent,
    fromEnd,
  );
}

export function assembleScenePanels(input: {
  placements: readonly PanelPlacement[];
  facetPanels: readonly FacetPanelDef[];
  displayScales: (p: number) => { h: PositionScale; v: PositionScale };
  hTitle: string;
  vTitle: string;
  coordProjectors: readonly PanelCoordProjector[];
  measureText?: TextMeasurer | undefined;
  axisTextSize: number;
  /** Tick chrome (theme tickLength + label gap) below gridBottom; renderer-matched. */
  tickChromePx?: number;
  hMinorBreaks?: readonly number[] | undefined;
  vMinorBreaks?: readonly number[] | undefined;
}): {
  scenePanels: ScenePanel[];
  xAxis: SceneAxis;
  yAxis: SceneAxis;
} {
  const { placements, facetPanels, displayScales, hTitle, vTitle } = input;
  const measurer = input.measureText ?? new MetricsTableMeasurer(FONT_METRICS);

  const scenePanels: ScenePanel[] = placements.map((placement, p) => {
    const { h, v } = displayScales(p);
    const majorBottom = axisTicks(h, placement.ticksH, placement.width, false);
    const majorLeft = axisTicks(v, placement.ticksV, placement.height, true);
    const projector = input.coordProjectors[p];
    const projectBottom = (tick: SceneTick): SceneTick => ({
      ...tick,
      pos:
        projector === undefined
          ? tick.pos
          : projector.x.projectFraction(tick.pos / placement.width) * placement.width,
    });
    const projectLeft = (tick: SceneTick): SceneTick => ({
      ...tick,
      pos:
        projector === undefined
          ? tick.pos
          : (1 - projector.y.projectFraction(1 - tick.pos / placement.height)) * placement.height,
    });
    const projectedBottom = [
      ...majorBottom,
      ...numericMinorTicks(h, input.hMinorBreaks, majorBottom, placement.width, false),
    ]
      .map((tick) => projectBottom(tick))
      .filter((tick) => Number.isFinite(tick.pos) && tick.pos >= 0 && tick.pos <= placement.width);
    const projectedLeft = [
      ...majorLeft,
      ...numericMinorTicks(v, input.vMinorBreaks, majorLeft, placement.height, true),
    ]
      .map((tick) => projectLeft(tick))
      .filter((tick) => Number.isFinite(tick.pos) && tick.pos >= 0 && tick.pos <= placement.height);
    const bottom =
      projector?.x.active === true
        ? suppressProjectedLabelOverlap(projectedBottom, "horizontal", measurer, input.axisTextSize)
        : projectedBottom;
    const left =
      projector?.y.active === true
        ? suppressProjectedLabelOverlap(projectedLeft, "vertical", measurer, input.axisTextSize)
        : projectedLeft;
    return {
      identity: facetPanels[p]!.identity,
      id: facetPanels[p]!.id,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      strip: facetPanels[p]!.label,
      clip: projector?.clip ?? true,
      axisX: placement.showAxisX ? bottom : null,
      axisY: placement.showAxisY ? left : null,
      grid: {
        x: bottom.filter((tick) => tick.kind === "major").map((tick) => tick.pos),
        y: left.filter((tick) => tick.kind === "major").map((tick) => tick.pos),
        minorX: bottom.filter((tick) => tick.kind === "minor").map((tick) => tick.pos),
        minorY: left.filter((tick) => tick.kind === "minor").map((tick) => tick.pos),
      },
    };
  });

  const firstX = scenePanels.find((p) => p.axisX !== null);
  const firstY = scenePanels.find((p) => p.axisY !== null);
  // Multi-line / rotated band labels need the x-axis title pushed below the whole
  // measured label band (max band height across panels for free scales), instead
  // of the renderer's fixed single-line offset.
  // Tick chrome from the active theme (renderer-matched), not a fixed default, so
  // a custom longer-tick theme still pushes the x title below the label band.
  const tickChromePx = input.tickChromePx ?? 9; // tickLength(6) + gap(3) defaults
  const TITLE_GAP_PX = 10; // sits within the axis-title reserve band
  const bandTitleOffset = placements.reduce((max, placement) => {
    const plan = placement.showAxisX ? placement.hGuidePlan : undefined;
    if (
      plan?.bandLabelMode === undefined ||
      plan.bandLabelMode === "single-line" ||
      plan.bandLabelBandHeight === undefined
    ) {
      return max;
    }
    return Math.max(max, tickChromePx + plan.bandLabelBandHeight + TITLE_GAP_PX);
  }, 0);
  const xAxis: SceneAxis = {
    ticks: firstX?.axisX ?? [],
    title: hTitle,
    ...(bandTitleOffset > 0 && { titleOffset: bandTitleOffset }),
  };
  const yAxis: SceneAxis = { ticks: firstY?.axisY ?? [], title: vTitle };

  return { scenePanels, xAxis, yAxis };
}
