import { mountEcharts } from "../adapters/echarts";
import { makeStackedBars } from "../scenarios";

export function run(root: HTMLElement): void {
  mountEcharts("bars-stacked", makeStackedBars(50, 4), root);
}
