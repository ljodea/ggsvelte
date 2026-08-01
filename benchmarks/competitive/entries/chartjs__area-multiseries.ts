import { mountChartJs } from "../adapters/chartjs";
import { makeMultiSeries } from "../scenarios";

export function run(root: HTMLElement): void {
  mountChartJs("area-multiseries", makeMultiSeries(3, 1000), root);
}
