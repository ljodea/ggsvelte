import { mountD3 } from "../adapters/d3";
import { makeStackedBars } from "../scenarios";

export function run(root: HTMLElement): void {
  mountD3("bars-stacked", makeStackedBars(50, 4), root);
}
