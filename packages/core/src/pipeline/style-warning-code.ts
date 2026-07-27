/**
 * Map pure-scale ScaleWarningCode → pipeline warning catalog code (#1043).
 * A missing map entry or uncatalogued style-* value fails at compile time.
 */
import type { PipelineWarningCode } from "../diagnostics-warning-catalog.js";
import type { ScaleWarningCode } from "../scales/state.js";

const STYLE_PREFIXED = {
  "palette-exhausted": "style-palette-exhausted",
  "fingerprint-mismatch": "style-fingerprint-mismatch",
  "version-mismatch": "style-version-mismatch",
  "out-of-domain": "style-out-of-domain",
} as const satisfies Record<ScaleWarningCode, PipelineWarningCode>;

export type StylePrefixedWarningCode = (typeof STYLE_PREFIXED)[ScaleWarningCode];

export function styleWarningCode(code: ScaleWarningCode): StylePrefixedWarningCode {
  return STYLE_PREFIXED[code];
}
