import { mountEcharts } from "../adapters/echarts";
import { makeMultiSeries } from "../scenarios";

export function run(root: HTMLElement): void {
  mountEcharts("area-multiseries", makeMultiSeries(3, 1000), root);
}
