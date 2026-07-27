/**
 * Geom/stat structural validation for bindLayer (rule forms, type mismatches,
 * required channels, color-on-fill warnings).
 */
export { resolveRuleForm } from "./bind-layer-rule.js";
export { validateGeomStatContracts } from "./bind-layer-type-contracts.js";
export { assertRequiredChannels } from "./bind-layer-required.js";
export { applyColorOnFillGeomWarning } from "./bind-layer-color-warn.js";
