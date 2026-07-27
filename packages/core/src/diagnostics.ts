/**
 * The core diagnostics surface — render-time errors, warnings, and advisories
 * (M3 error-catalog audit). Error *prose* for pipeline codes lives in
 * @ggsvelte/spec (`PIPELINE_ERROR_CATALOG`, #987); this package re-exports it
 * and owns warnings, advisories, CLI diagnostics, and every emission site.
 * diagnostics.test.ts scans the core sources to prove catalogs are complete
 * in both directions (every emitted code is cataloged; every cataloged code
 * is emitted somewhere).
 *
 * Large tables:
 * - diagnostics-error-catalog.ts — re-exports PIPELINE_ERROR_CATALOG from spec
 * - diagnostics-warning-catalog.ts — PIPELINE_WARNING_CATALOG
 * This file keeps advisories, CLI diagnostics, and re-exports the public surface.
 *
 * Naming note: `palette-exhausted` appears as BOTH an error and a warning by
 * design (the palette-exhaustion contract): the default `onExhaust: "cycle"`
 * emits the warning; opt-in `onExhaust: "error"` throws the error.
 * `max-marks-exceeded` likewise exists as a PipelineError (renderToSVGString)
 * and a CLI diagnostic (the CLI's own --max-marks check).
 */

export {
  PIPELINE_ERROR_CATALOG,
  type PipelineErrorCatalogEntry,
  type PipelineErrorCode,
} from "./diagnostics-error-catalog.js";
export {
  PIPELINE_WARNING_CATALOG,
  type PipelineWarningCode,
} from "./diagnostics-warning-catalog.js";

/**
 * Advisories (`RenderModel.advisories`, Hadley lesson 12): every heuristic
 * the pipeline takes, as `{ code, path, chosen, howToOverride }` — agents see
 * the guess and can correct it. Distinct from spec-lint advisories
 * (@ggsvelte/spec `lintSpec`), which flag questionable-but-valid SPECS before
 * any pipeline run.
 */
export const ADVISORY_CATALOG = {
  "scale-type-inferred": {
    summary: "A positional scale's type was inferred from the mapped data.",
  },
  "zero-forced": {
    summary: "Bars/areas forced the measure axis to include zero.",
  },
  "scale-baseline-transformed-origin": {
    summary:
      "A bar/col/area/histogram/density measure axis under transform: log10 baselines at the transformed-space origin (semantic 1), since log10 has no semantic-zero image.",
  },
  "bar-x-discretized": {
    summary: "A numeric x on a count-stat bar layer was treated as discrete categories.",
  },
  "bin-default-bins": {
    summary: "The bin stat used its default bin count; set params.binwidth to control it.",
  },
  "smooth-method-inferred": {
    summary: "The smooth stat chose its method (lm vs loess) from the group size.",
  },
  "jitter-seeded": {
    summary: "The jitter position used its default deterministic seed.",
  },
  "palette-inferred": {
    summary: "A color scale used the edition's default palette/ramp.",
  },
  "canvas-auto": {
    summary:
      "A high-count layer auto-switched to the canvas backend (a11y/copy-SVG tradeoff disclosed).",
  },
  "temporal-year-inferred": {
    summary:
      "A four-digit string field was inferred as calendar years; a discrete override is available.",
  },
  "temporal-inference-ambiguous": {
    summary: "A date-like field remained discrete because multiple date orders matched.",
  },
  "temporal-inference-invalid": {
    summary: "A date-like field remained discrete because whole-column validation failed.",
  },
  "band-labels-wrapped": {
    summary:
      "Long categorical x labels were wrapped onto multiple lines to avoid collisions; pin with scales.x.guide.mode or coordFlip().",
  },
  "band-labels-rotated": {
    summary:
      "Long categorical x labels were rotated to avoid collisions; pin with scales.x.guide.mode/angle, or coordFlip() for horizontal rows.",
  },
} as const satisfies Record<string, { summary: string }>;

export type AdvisoryCode = keyof typeof ADVISORY_CATALOG;

/** CLI-only diagnostics (`ggsvelte-render` stderr JSON lines, exit codes 1–3). */
export const CLI_DIAGNOSTIC_CATALOG = {
  usage: { summary: "Bad flags or arguments (exit 2). --help shows usage." },
  "unreadable-input": { summary: "The spec/data file (or stdin) could not be read (exit 2)." },
  "invalid-json": { summary: "The spec or data file is not valid JSON (exit 2)." },
  "invalid-data-file": {
    summary: "--data must be a JSON object mapping dataset names to inline data (exit 2).",
  },
  "max-marks-exceeded": {
    summary: "The plot renders more marks than --max-marks allows (exit 1).",
  },
  internal: { summary: "An unexpected internal error (exit 1). Please report it." },
} as const satisfies Record<string, { summary: string }>;

export type CLIDiagnosticCode = keyof typeof CLI_DIAGNOSTIC_CATALOG;
