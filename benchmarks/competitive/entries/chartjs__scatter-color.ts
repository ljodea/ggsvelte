import { mountChartJs } from "../adapters/chartjs";
import { makeScatter } from "../scenarios";

export function run(root: HTMLElement): void {
  mountChartJs("scatter-color", makeScatter(1000), root);
}
