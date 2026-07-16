/**
 * Panel layout display surface after coord-flip remapping.
 */
import type { TickFormatter } from "../layout/layout.js";
import type { PositionScale } from "../scales/train.js";

export interface PanelLayoutDisplay {
  hTitle: string;
  vTitle: string;
  formatX: TickFormatter | undefined;
  formatY: TickFormatter | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  freeH: boolean;
  freeV: boolean;
  displayScales: (p: number) => { h: PositionScale; v: PositionScale };
}
