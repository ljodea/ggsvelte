/**
 * Scale-training rich diagnostics are emitted with structured facts at train
 * time (#628) via `diagnostics-emit.ts`. This module no longer reconstructs
 * evidence by parsing human-readable warning messages.
 *
 * Kept as a thin re-export surface so any external import path stays stable.
 */
export {
  dedupeScaleDiagnostics,
  emitScaleBaselineTransformedOrigin,
  emitScaleBreakOutsideDomain,
} from "./diagnostics-emit.js";
