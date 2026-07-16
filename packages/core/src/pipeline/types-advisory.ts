/**
 * Pipeline diagnostics: advisories, warnings, structured errors, and canvas threshold.
 */

export interface Advisory {
  code: string;
  /** Where the decision applies (e.g. "scales.x"). */
  path: string;
  /** What was chosen. */
  chosen: string;
  /** How to override the heuristic. */
  howToOverride: string;
}

/** A data-level problem that did not stop the render. */
export interface PipelineWarning {
  code: string;
  message: string;
}

/** A spec- or input-level problem that stops the render (structured). */
export class PipelineError extends Error {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, message: string) {
    super(message);
    this.name = "PipelineError";
    this.code = code;
    this.path = path;
  }
}

/** Default `render: "auto"` mark-count threshold for the canvas backend. */
export const CANVAS_AUTO_THRESHOLD = 2000;
