/**
 * assembleScene input contract.
 */
import type { GeometryBatch, SceneLegend } from "../scene.js";
import type { ThemeTokens } from "../theme.js";
import type { PositionScale } from "../scales/train.js";

import type { FacetPanelDef } from "./facets.js";
import type { PanelPlacement } from "./panel-layout.js";

export interface AssembleSceneInput {
  width: number;
  height: number;
  placements: readonly PanelPlacement[];
  facetPanels: readonly FacetPanelDef[];
  displayScales: (p: number) => { h: PositionScale; v: PositionScale };
  hTitle: string;
  vTitle: string;
  batches: GeometryBatch[];
  legendBlock: { legends: SceneLegend[]; width: number };
  topBand: number;
  theme: ThemeTokens;
  title: string;
  subtitle: string;
  caption: string;
}
