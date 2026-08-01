import { mountChartJs } from "../adapters/chartjs";
import { makeStackedBars } from "../scenarios";

export function run(root: HTMLElement): void {
  mountChartJs("bars-stacked", makeStackedBars(50, 4), root);
}
