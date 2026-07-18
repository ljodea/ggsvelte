/// <reference lib="dom" />
// @ggsvelte/core/dom — DOM entrypoint: canvas batch renderers (decision 0006
// strata recipes). Browser-only; never imported by the pure entry. The Svelte
// adapter composes these into the strata DOM;
// renderToSVGString never touches this module (always all-SVG).
//
// Lifecycle (Hadley lesson 13; meanings in CONTRIBUTING.md): tags collected
// into lifecycle.json by scripts/gen-lifecycle.ts.
// @lifecycle-default experimental

export {
  cssColorResolver,
  drawBatch,
  drawClippedToPanel,
  drawStratum,
  sizeCanvasForDpr,
} from "./canvas.js";
export type { ColorResolver } from "./canvas.js";
export type { CanvasFocusPresentation, PrimitiveFocusMask } from "./canvas.js";

export { StaticQuadtree } from "./quadtree.js";
