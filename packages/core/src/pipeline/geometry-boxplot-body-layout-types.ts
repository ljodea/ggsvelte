/**
 * Boxplot body layout result shape.
 */
import type { BoxplotParams } from "@ggsvelte/spec";

export interface BoxplotBodyLayout {
  centerPx: number[];
  halfPx: number[];
  rects: number[];
  rectRows: number[];
  keptRows: number[];
  whiskers: number[];
  whiskerRows: number[];
  medians: number[];
  medianRows: number[];
  linewidth: number;
  alpha: number;
  params: BoxplotParams;
}
