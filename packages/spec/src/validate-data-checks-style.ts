/**
 * Style aesthetic data-aware scale checks (shape/linetype finite symbols;
 * size/linewidth/alpha sequential/binned + temporal).
 *
 * - validate-data-checks-style-finite.ts — shape / linetype
 * - validate-data-checks-style-numeric.ts — size / linewidth / alpha
 *
 * Shared temporal memoization: validate-data-checks-temporal.ts.
 * Position: validate-data-checks-position.ts. Color: validate-data-checks-color.ts.
 * Orchestrator: validate-data-checks.ts.
 */
export { checkFiniteStyleScaleDataCompatibility } from "./validate-data-checks-style-finite.js";
export { checkNumericStyleScaleDataCompatibility } from "./validate-data-checks-style-numeric.js";
