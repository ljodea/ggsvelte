/**
 * Shared panel layout result types.
 */
import type { LayoutResult, TemporalLayoutDomainContext, TickFormatter } from "../layout/layout.js";
import type { AxisGuidePlan } from "../layout/temporal-guide.js";
import type { PositionScale } from "../scales/train.js";
import { buildLegends } from "../legend.js";

export interface PanelPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  ticksH: LayoutResult["x"]["ticks"];
  ticksV: LayoutResult["y"]["ticks"];
  hGuidePlan?: AxisGuidePlan;
  vGuidePlan?: AxisGuidePlan;
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
  guidePlans: readonly AxisGuidePlan[];
}

export type DisplayScalesFn = (p: number) => { h: PositionScale; v: PositionScale };
export type DisplayTemporalFn = (p: number) => {
  h?: TemporalLayoutDomainContext;
  v?: TemporalLayoutDomainContext;
};
