import { mountUplot } from "../adapters/uplot";
import { makeMultiSeries } from "../scenarios";

export function run(root: HTMLElement): void {
  mountUplot("line-multiseries", makeMultiSeries(3, 1000), root);
}
