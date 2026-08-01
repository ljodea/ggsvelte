import { mountD3 } from "../adapters/d3";
import { makeScatter } from "../scenarios";

// Node bundle graph only — DOM mount is a no-op without document.
export function run(root: HTMLElement): void {
  mountD3("scatter-color", makeScatter(1000), root);
}
