/**
 * Build ScenePanel[] and shared axis ticks from placements.
 */
import type { SceneAxis, ScenePanel, SceneTick } from "../scene.js";
import type { PositionScale } from "../scales/train.js";

import type { FacetPanelDef } from "./facets.js";
import { axisTicks } from "./layout-helpers.js";
import type { PanelPlacement } from "./panel-layout.js";

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
  hMinorBreaks?: readonly number[] | undefined;
  vMinorBreaks?: readonly number[] | undefined;
}): {
  scenePanels: ScenePanel[];
  xAxis: SceneAxis;
  yAxis: SceneAxis;
} {
  const { placements, facetPanels, displayScales, hTitle, vTitle } = input;

  const scenePanels: ScenePanel[] = placements.map((placement, p) => {
    const { h, v } = displayScales(p);
    const majorBottom = axisTicks(h, placement.ticksH, placement.width, false);
    const majorLeft = axisTicks(v, placement.ticksV, placement.height, true);
    const bottom = [
      ...majorBottom,
      ...numericMinorTicks(h, input.hMinorBreaks, majorBottom, placement.width, false),
    ];
    const left = [
      ...majorLeft,
      ...numericMinorTicks(v, input.vMinorBreaks, majorLeft, placement.height, true),
    ];
    return {
      identity: facetPanels[p]!.identity,
      id: facetPanels[p]!.id,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      strip: facetPanels[p]!.label,
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
  const xAxis: SceneAxis = { ticks: firstX?.axisX ?? [], title: hTitle };
  const yAxis: SceneAxis = { ticks: firstY?.axisY ?? [], title: vTitle };

  return { scenePanels, xAxis, yAxis };
}
