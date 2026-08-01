import { mountUplot } from "../adapters/uplot";
import { makeScatter } from "../scenarios";

export function run(root: HTMLElement): void {
  mountUplot("scatter-color", makeScatter(1000), root);
}
