/**
 * assembleScene input contract.
 */
import type { PanelCoordProjector } from "../coord-projector.js";
import type { TextMeasurer } from "../layout/measure.js";
import type { GeometryBatch, SceneLegend } from "../scene.js";
import type { ThemeTokens } from "../theme.js";
import type { PositionScale } from "../scales/train.js";

import type { FacetPanelDef } from "./facets.js";
import type { AxisGuideAppearance } from "./guide-config.js";
import type { PanelPlacement } from "./panel-layout.js";

export interface AssembleSceneInput {
  width: number;
  height: number;
  placements: readonly PanelPlacement[];
  facetPanels: readonly FacetPanelDef[];
  displayScales: (p: number) => { h: PositionScale; v: PositionScale };
  hTitle: string;
  vTitle: string;
  hGuide: AxisGuideAppearance;
  vGuide: AxisGuideAppearance;
  coordProjectors: readonly PanelCoordProjector[];
  measureText?: TextMeasurer | undefined;
  axisTextSize: number;
  hMinorBreaks?: readonly number[] | undefined;
  vMinorBreaks?: readonly number[] | undefined;
  batches: GeometryBatch[];
  legendBlock: { legends: SceneLegend[]; width: number; bottomHeight: number };
  topBand: number;
  bottomBand: number;
  theme: ThemeTokens;
  title: string;
  subtitle: string;
  caption: string;
}
