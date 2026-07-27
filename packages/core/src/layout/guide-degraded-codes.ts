/**
 * Guide-plan degradation codes re-emitted as pipeline warnings / scale
 * diagnostics. Closed set of literals from band-guide / temporal-guide (#1043).
 */
import type { PipelineWarningCode } from "../diagnostics-warning-catalog.js";

/** Exhaustive list; `satisfies` proves each member is a catalogued warning. */
const GUIDE_DEGRADED_CODES = [
  "band-label-overlap",
  "band-label-margin-overflow",
  "temporal-label-overlap",
  "temporal-label-margin-overflow",
  "temporal-break-outside-domain",
] as const satisfies readonly PipelineWarningCode[];

export type GuideDegradedCode = (typeof GUIDE_DEGRADED_CODES)[number];
