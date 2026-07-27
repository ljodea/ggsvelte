/**
 * Pipeline diagnostics: advisories, warnings, structured errors, and canvas threshold.
 *
 * Code fields are catalog unions (#1043) so emit sites get compile-time
 * completion and typos fail at `tsc`, not via the retired source scanner.
 */
import type { AdvisoryCode } from "../diagnostics.js";
import type { PipelineErrorCode } from "../diagnostics-error-catalog.js";
import type { PipelineWarningCode } from "../diagnostics-warning-catalog.js";

import type { ScaleDiagnostic } from "./types-scale-diagnostics.js";

export interface Advisory {
  code: AdvisoryCode;
  /** Where the decision applies (e.g. "scales.x"). */
  path: string;
  /** What was chosen. */
  chosen: string;
  /** How to override the heuristic. */
  howToOverride: string;
}

/** A data-level problem that did not stop the render. */
export interface PipelineWarning {
  code: PipelineWarningCode;
  message: string;
}

/** A spec- or input-level problem that stops the render (structured). */
export class PipelineError extends Error {
  readonly code: PipelineErrorCode;
  readonly path: string;
  readonly diagnostic: ScaleDiagnostic | undefined;

  constructor(
    code: PipelineErrorCode,
    path: string,
    message: string,
    diagnostic?: ScaleDiagnostic,
  ) {
    super(message);
    this.name = "PipelineError";
    this.code = code;
    this.path = path;
    this.diagnostic = diagnostic;
  }
}

/** Default `render: "auto"` mark-count threshold for the canvas backend. */
export const CANVAS_AUTO_THRESHOLD = 2000;
