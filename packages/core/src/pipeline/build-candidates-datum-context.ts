/**
 * Resolve outlier/annotation context and series rank for identity candidates.
 * Implementations live in sibling modules; this facade keeps import paths stable.
 */
export { resolveAnnotationIntercepts } from "./build-candidates-datum-annotation.js";
export { ordinalSeriesRank } from "./build-candidates-datum-ordinal-rank.js";
export { resolveOutlierContext } from "./build-candidates-datum-outlier.js";
