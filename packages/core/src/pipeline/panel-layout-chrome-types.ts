/**
 * Panel layout chrome public shape (labs + display + legends).
 */
import type { LayoutTheme, TickFormatter } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import type { buildLegends } from "../legend.js";
import type { PositionScale } from "../scales/train.js";

export interface PanelLayoutChrome {
  title: string;
  subtitle: string;
  caption: string;
  xTitle: string;
  yTitle: string;
  hTitle: string;
  vTitle: string;
  topBand: number;
  bottomBand: number;
  axisTitleBand: number;
  layoutHeight: number;
  formatX: TickFormatter | undefined;
  formatY: TickFormatter | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  freeH: boolean;
  freeV: boolean;
  displayScales: (p: number) => { h: PositionScale; v: PositionScale };
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
  legendBlock: ReturnType<typeof buildLegends>;
}
