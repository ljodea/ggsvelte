/**
 * Panel layout chrome public shape (labs + display + legends).
 */
import type { LayoutTheme, TickFormatter } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import type { buildLegends } from "../legend.js";
import type { PositionScale } from "../scales/train.js";

import type { DisplayBandFn, DisplayTemporalFn } from "./panel-layout-types.js";

export interface PanelLayoutChrome {
  flip: boolean;
  scalesConfig: import("@ggsvelte/spec").Scales;
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
  displayTemporal: DisplayTemporalFn;
  displayBand: DisplayBandFn;
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
  legendBlock: ReturnType<typeof buildLegends>;
}
