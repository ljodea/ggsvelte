import { mountEcharts } from "../adapters/echarts";
import { makeScatter } from "../scenarios";

export function run(root: HTMLElement): void {
  mountEcharts("scatter-color", makeScatter(1000), root);
}
