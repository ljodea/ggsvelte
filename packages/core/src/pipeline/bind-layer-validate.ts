/**
 * Geom/stat structural validation for bindLayer (rule forms, type mismatches,
 * required channels, color-on-fill warnings).
 */
export { resolveRuleForm } from "./bind-layer-rule.js";
export {
  applyColorOnFillGeomWarning,
  assertRequiredChannels,
  validateGeomStatContracts,
} from "./bind-layer-geom-contracts.js";
