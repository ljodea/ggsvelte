import { mountD3 } from "../adapters/d3";
import { makeMultiSeries } from "../scenarios";

export function run(root: HTMLElement): void {
  mountD3("area-multiseries", makeMultiSeries(3, 1000), root);
}
