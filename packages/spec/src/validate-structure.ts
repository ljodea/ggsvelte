/**
 * Data-free structural grammar checks (tier-2, opt-in via validate options).
 *
 * Implementation:
 *  - validate-structure-layers.ts — geom channels, rule forms, M2 layer rules
 *  - validate-structure-scales.ts — named color/fill scheme vs family
 *  - validate-structure-facet.ts — wrap XOR grid form
 *
 * Used only by validate() — not public surface.
 */

export { layerStructuralErrors } from "./validate-structure-layers.js";
export { colorScaleStructuralErrors } from "./validate-structure-scales.js";
export { facetStructuralErrors } from "./validate-structure-facet.js";
