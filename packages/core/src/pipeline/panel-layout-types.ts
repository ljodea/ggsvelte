/**
 * Shared panel layout result types.
 */
import type { LayoutResult, TickFormatter } from "../layout/layout.js";
import type { PositionScale } from "../scales/train.js";
import { buildLegends } from "../legend.js";

export interface PanelPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  ticksH: LayoutResult["x"]["ticks"];
  ticksV: LayoutResult["y"]["ticks"];
  showAxisX: boolean;
  showAxisY: boolean;
}

export interface PanelLayoutResult {
  placements: PanelPlacement[];
  title: string;
  subtitle: string;
  caption: string;
  hTitle: string;
  vTitle: string;
  xTitle: string;
  yTitle: string;
  topBand: number;
  formatX: TickFormatter | undefined;
  formatY: TickFormatter | undefined;
  displayScales: (p: number) => { h: PositionScale; v: PositionScale };
  legendBlock: ReturnType<typeof buildLegends>;
}

export type DisplayScalesFn = (p: number) => { h: PositionScale; v: PositionScale };
