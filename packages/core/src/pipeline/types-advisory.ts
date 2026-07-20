/**
 * Pipeline diagnostics: advisories, warnings, structured errors, and canvas threshold.
 */
import type { ScaleDiagnostic } from "./types-scale-diagnostics.js";

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
  readonly diagnostic: ScaleDiagnostic | undefined;

  constructor(code: string, path: string, message: string, diagnostic?: ScaleDiagnostic) {
    super(message);
    this.name = "PipelineError";
    this.code = code;
    this.path = path;
    this.diagnostic = diagnostic;
  }
}

/** Default `render: "auto"` mark-count threshold for the canvas backend. */
export const CANVAS_AUTO_THRESHOLD = 2000;
