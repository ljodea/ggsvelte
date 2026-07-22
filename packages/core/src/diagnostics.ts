/**
 * The core diagnostics catalog — render-time errors, warnings, and advisories
 * (M3 error-catalog audit). @ggsvelte/spec owns the VALIDATION catalog
 * (ERROR_CATALOG in its errors.ts); this module owns everything the pipeline,
 * renderer, and CLI can emit at run time. The docs error-reference page and
 * llms-full.txt render straight from these tables — one source, no drift —
 * and diagnostics.test.ts scans the core sources to prove the tables are
 * complete in both directions (every emitted code is cataloged; every
 * cataloged code is emitted somewhere).
 *
 * Naming note: `palette-exhausted` appears as BOTH an error and a warning by
 * design (the palette-exhaustion contract): the default `onExhaust: "cycle"`
 * emits the warning; opt-in `onExhaust: "error"` throws the error.
 * `max-marks-exceeded` likewise exists as a PipelineError (renderToSVGString)
 * and a CLI diagnostic (the CLI's own --max-marks check).
 */

/** One render-time error catalog entry. */
export interface PipelineErrorCatalogEntry {
  summary: string;
  fix: string;
}

/** Structured errors thrown as `PipelineError { code, path, message }`. */
export const PIPELINE_ERROR_CATALOG = {
  "guide-aesthetic-incompatible": {
    summary: "A requested guide variant does not match the trained aesthetic scale family.",
    fix: "Use axis for positions, legend for discrete scales, colorbar for sequential colors, colorsteps for binned colors, or none.",
  },
  "guide-layout-overflow": {
    summary: "A guide configured with collision: error cannot fit its authored label.",
    fix: 'Use collision: "ellipsis" for long labels; increase the chart size, reduce categories, or suppress an oversized guide.',
  },
  "no-data": {
    summary: "The spec has no data source and no layer provides one.",
    fix: "Set spec.data ({values}, {columns}, or {name}) or pass named data via RunOptions.data.",
  },
  "dataset-collision": {
    summary: "A dataset name is defined in both spec.datasets and RunOptions.data.",
    fix: "Rename one of them, or pass allowOverride: true to let the runtime data win.",
  },
  "unknown-dataset": {
    summary: 'A {"name": ...} data ref names a dataset that is not defined anywhere.',
    fix: "Define it in spec.datasets or RunOptions.data (the message lists the available names).",
  },
  "unknown-field": {
    summary: "A channel maps a field that does not exist in the bound data.",
    fix: "Map the channel to one of the available fields (the message lists them).",
  },
  "all-null-column": {
    summary: "A mapped column contains only null values (tier-2 failure policy).",
    fix: "Map the channel to a column with actual values, or fix the data.",
  },
  "missing-channel": {
    summary: "A geom is missing a required aesthetic channel at render time.",
    fix: "Map the named channel in the layer's aes or the plot-level aes.",
  },
  "unknown-stat-column": {
    summary: "A { stat } channel names a column the layer's stat does not generate.",
    fix: "Use a column the stat generates (each stat's contract is documented), or change the stat.",
  },
  "channel-type-mismatch": {
    summary: "A mapped field's type is incompatible with the layer's geom/stat.",
    fix: "Map a field of the required type, or switch to a geom that fits the field.",
  },
  "computed-y-mapped": {
    summary: "A layer whose stat computes y (count, bin, density) maps aes.y to a data field.",
    fix: 'Unset y with null — or use geom "col" for pre-computed bar heights.',
  },
  "bin-center-and-boundary": {
    summary: "A bin-stat layer sets BOTH params.center and params.boundary.",
    fix: "Keep one bin-grid alignment parameter and remove the other.",
  },
  "rule-form-ambiguous": {
    summary: "A rule layer mixes fixed intercepts with mapped aes.x/aes.y.",
    fix: "Use the annotation form (intercept params) OR a data mapping, never both.",
  },
  "rule-form-missing": {
    summary: "A rule layer has neither intercepts nor a mapped aes.x/aes.y — nothing to draw.",
    fix: "Set params.yintercept/xintercept, or map aes.x/aes.y to a field.",
  },
  "rule-both-axes": {
    summary: "A data-driven rule layer maps BOTH aes.x and aes.y.",
    fix: "Keep one direction and unset the other channel with null.",
  },
  "ribbon-orientation-ambiguous": {
    summary:
      "A ribbon layer maps both x-orientation and y-orientation contracts without params.orientation.",
    fix: 'Set params.orientation to "x" or "y", or map only one complete interval contract.',
  },
  "ribbon-inverted-bounds": {
    summary: "A ribbon layer has one or more rows where the lower bound exceeds the upper bound.",
    fix: "Swap or correct ymin/ymax (or xmin/xmax) so lower ≤ upper on every finite row.",
  },
  "facet-form-ambiguous": {
    summary: "A facet sets BOTH the wrap form and the rows/cols grid form.",
    fix: "Keep facet.wrap OR facet.rows/facet.cols, never both.",
  },
  "facet-form-missing": {
    summary: "A facet sets neither wrap nor rows/cols.",
    fix: "Set facet.wrap (wrap form) or facet.rows/facet.cols (grid form).",
  },
  "invalid-scale-domain": {
    summary: "An explicit scale domain is malformed for its scale type.",
    fix: "Provide a two-element [min, max] for continuous scales (values of the field's type).",
  },
  "invalid-scale-breaks": {
    summary: "One or more explicit scale breaks do not match the scale's parser.",
    fix: "Use numeric breaks for numeric scales or values matching the temporal parse option.",
  },
  "invalid-temporal-labels": {
    summary: "A temporal dateLabels string uses an unsupported or incomplete token.",
    fix: "Use only the documented closed dateLabels token grammar.",
  },
  "invalid-temporal-locale": {
    summary: "A temporal scale locale is not a valid supported BCP 47 locale.",
    fix: "Use a canonical BCP 47 locale such as en-US, en-GB, fr-FR, or ja-JP.",
  },
  "temporal-parse-failed": {
    summary: "An explicit temporal parser rejected one or more source values.",
    fix: "Correct the rejected values, choose the matching parser, or explicitly opt into censoring.",
  },
  "temporal-break-limit": {
    summary: "An explicit temporal interval would generate more bounded ticks than allowed.",
    fix: "Choose a coarser calendar interval.",
  },
  "temporal-break-progression": {
    summary: "Calendar interval progression failed to advance monotonically.",
    fix: "Choose another timezone, disambiguation policy, or interval and report the failing case.",
  },
  "invalid-scale-transform": {
    summary: "The scale transform registry was asked for an unknown transform key.",
    fix: "Use a supported transform (identity, log10, sqrt). This indicates malformed runtime input.",
  },
  "scale-transform-domain": {
    summary:
      "An explicit scale domain falls outside the transform's valid range (log10 <= 0, sqrt < 0).",
    fix: "Restrict the domain to the transform's valid range, or use the identity transform.",
  },
  "scale-type-transform-conflict": {
    summary:
      'A scale declares an incompatible type + transform (e.g. type: "log" with a non-log10 transform, or a temporal scale with a non-identity transform).',
    fix: 'Use type: "linear" with the intended transform, or drop the transform (a base-10 log scale is type: "linear", transform: "log10").',
  },
  "scale-zero-invalid-for-transform": {
    summary:
      "zero: true was requested under a transform with no valid image for semantic zero (log10).",
    fix: "Remove zero: true; log10 positions use the transformed-space origin (semantic 1), never log10(0).",
  },
  "coord-transform-domain": {
    summary:
      "A post-stat coordinate transform cannot project its trained or explicit viewport domain.",
    fix: "Choose coordinate limits inside the transform domain, or use the identity coordinate transform.",
  },
  "coord-transform-temporal": {
    summary: "A non-identity coordinate transform was requested for a temporal axis.",
    fix: "Keep temporal coordinates on identity; use identity coordinate limits/reverse for a viewport.",
  },
  "coord-transform-continuous": {
    summary:
      "A quantitative coordinate transform or numeric limits were requested for a band axis.",
    fix: "Use identity coordinates for categories, or configure a continuous quantitative scale.",
  },
  "binned-scale-requires-continuous": {
    summary: 'A type: "binned" scale is bound to a discrete or temporal field.',
    fix: 'Map a quantitative field, or use type: "band"/"time" instead of "binned".',
  },
  "binned-scale-break-limit": {
    summary: "A binned scale's automatic or explicit breaks would exceed MAX_BINNED_BREAKS (64).",
    fix: "Supply fewer explicit breaks, or widen them so automatic binning stays under the limit.",
  },
  "palette-exhausted": {
    summary:
      'A discrete color scale with onExhaust: "error" ran out of palette entries (the default "cycle" only warns).',
    fix: "Provide a larger range, set an explicit domain, or accept cycling by removing onExhaust.",
  },
  "color-temporal-parse": {
    summary: "A temporal color/fill scale could not parse the complete mapped column.",
    fix: "Set the exact parse order, correct the rejected values, or explicitly choose parseFailure: censor.",
  },
  "color-temporal-kind": {
    summary:
      "A temporal color/fill scale requested date or datetime precision that the data does not have.",
    fix: "Use the matching date/datetime helper or correct the source precision.",
  },
  "color-manual-domain-range": {
    summary: "A manual color/fill scale has a different number of domain values and range colors.",
    fix: "Provide exactly one range color for every domain value.",
  },
  "color-binned-breaks": {
    summary: "Binned color/fill boundaries are invalid, unparseable, duplicated, or unordered.",
    fix: "Provide 2–65 strictly increasing boundaries valid for the parser and transform.",
  },
  "color-binned-empty": {
    summary: "A binned color/fill scale has no values inside its parser/transform domain.",
    fix: "Correct the mapped values, parser, or transform, or provide a valid explicit domain.",
  },
  "color-binned-domain": {
    summary: "A binned color/fill domain is degenerate or invalid for its transform.",
    fix: "Provide two distinct domain endpoints valid for identity, log10, or sqrt.",
  },
  "color-domain-invalid": {
    summary: "A sequential color/fill domain does not contain exactly two parseable values.",
    fix: "Provide a two-value semantic domain matching the mapped field and parser.",
  },
  "color-transform-empty": {
    summary: "Every mapped color/fill value is invalid for the requested transform.",
    fix: "Correct the mapped data or choose a transform whose domain contains the values.",
  },
  "color-domain-transform": {
    summary: "A sequential color/fill domain is invalid for its requested transform.",
    fix: "Use positive endpoints for log10, non-negative endpoints for sqrt, or identity.",
  },
  "unsupported-aesthetic-scale": {
    summary: "A finite shape/linetype aesthetic was configured as a continuous scale.",
    fix: "Use a binned scale for quantitative values or an ordinal scale for categories.",
  },
  "unsupported-geom-aesthetic": {
    summary: "A mapped style aesthetic is not consumed by the selected geom.",
    fix: "Remove the mapping or move it to one of the compatible geoms listed in the error.",
  },
  "unsupported-annotation-style": {
    summary:
      "A fixed-intercept annotation rule maps a style to a field or after-stat column, but it has no data rows to map.",
    fix: "Use a constant style value (optionally { value, scale: true }) on the annotation rule.",
  },
  "tile-nonpositive-size": {
    summary: "A tile layer has a non-positive or non-finite width/height.",
    fix: "Map a positive width/height or set params.width / params.height to a positive number.",
  },
  "raster-duplicate-cells": {
    summary: "A raster layer has duplicate (x, y) coordinates.",
    fix: 'Aggregate to one value per cell, or use geom "tile" for overlapping cells.',
  },
  "unsupported-param": {
    summary: "A layer param value is not supported by this runtime.",
    fix: "Use a documented supported value for the param (see the error message).",
  },
  "invalid-aesthetic-constant": {
    summary: "A literal style constant is outside the aesthetic's supported output domain.",
    fix: "Use a positive size/linewidth, alpha in [0,1], or a documented shape/linetype name.",
  },
  "style-temporal-parse": {
    summary: "A temporal numeric style scale could not parse the complete mapped column.",
    fix: "Set the exact parser, correct the rejected values, or explicitly choose censoring.",
  },
  "style-temporal-kind": {
    summary: "A temporal numeric style scale requested the wrong date/datetime precision.",
    fix: "Use the matching date/datetime helper or correct the source precision.",
  },
  "style-manual-domain-range": {
    summary: "A manual style scale has different domain and range lengths.",
    fix: "Provide exactly one output style for every domain value.",
  },
  "style-palette-exhausted": {
    summary: "A finite style scale needs more distinguishable outputs than its range provides.",
    fix: "Provide a larger range, reduce categories/bins, or deliberately opt into cycling.",
  },
  "style-domain-empty": {
    summary: "No finite values can train the requested numeric or binned style scale.",
    fix: "Correct the mapped values or provide a valid explicit domain.",
  },
  "style-domain-invalid": {
    summary: "An explicit style domain is malformed or contradicts its binned boundaries.",
    fix: "Provide two finite semantic endpoints matching the first and last boundaries.",
  },
  "style-range-invalid": {
    summary: "A numeric sequential/binned style range has fewer than two endpoints.",
    fix: "Provide at least two valid output values in the aesthetic's supported bounds.",
  },
  "style-binned-breaks": {
    summary: "Binned style boundaries are missing, non-finite, duplicated, or unordered.",
    fix: "Provide 2–65 strictly increasing numeric boundaries.",
  },
  "stat-channel-unsupported": {
    summary: "A { stat } style mapping names an output the selected stat does not publish.",
    fix: "Use a generated output listed for that stat or map the original field instead.",
  },
  "unknown-theme": {
    summary: "spec.theme names a theme that is not registered.",
    fix: "Use a registered name (default, light, dark, minimal) or a theme object.",
  },
  "renderer-failure": {
    summary: "The SVG renderer threw while drawing a scene (never blank output — failure policy).",
    fix: "This is a ggsvelte bug; the message carries the underlying error. Please report it.",
  },
  "max-marks-exceeded": {
    summary: "renderToSVGString refused to render more marks than its maxMarks safety limit.",
    fix: "Raise options.maxMarks deliberately, reduce the data, or render interactively (canvas).",
  },
} as const satisfies Record<string, PipelineErrorCatalogEntry>;

export type PipelineErrorCode = keyof typeof PIPELINE_ERROR_CATALOG;

/** Warnings (`RenderModel.warnings`): degraded-but-rendered conditions. */
export const PIPELINE_WARNING_CATALOG = {
  "empty-data": {
    summary: "The data has no rows; the frame and axes render as a placeholder.",
  },
  "empty-layer": {
    summary: "A layer produced no drawable marks after stats/positions; it was skipped.",
  },
  "empty-domain": {
    summary: "A positional scale found no finite values; a placeholder domain is used.",
  },
  "removed-missing": {
    summary:
      "Rows with missing/non-finite values in required channels were dropped (count in message).",
  },
  "raster-irregular-spacing": {
    summary:
      "Raster cell centers are not on a regular grid; the minimum spacing is used (prefer geom tile).",
  },
  "scale-transform-domain": {
    summary:
      "A pre-stat transform dropped values outside its domain (log10 <= 0, sqrt < 0); count in message.",
  },
  "scale-oob-censored": {
    summary: "Values outside explicit source limits were censored to missing before stats.",
  },
  "scale-oob-squished": {
    summary:
      "Values outside explicit source limits were squished to the nearest limit before stats.",
  },
  "scale-break-outside-domain": {
    summary:
      "One or more explicit continuous breaks were outside the trained display domain and omitted.",
  },
  "sequential-discrete-field": {
    summary: "A sequential color scale is fed a discrete field; unparseable values render unknown.",
  },
  "color-temporal-censored": {
    summary:
      "A temporal color/fill parser censored invalid source values by explicit author request.",
  },
  "color-transform-invalid": {
    summary:
      "Some color/fill values are outside the requested transform domain and render unknown.",
  },
  "color-na-values": {
    summary: "Missing color/fill values render with the configured NA color (count in message).",
  },
  "color-unknown-values": {
    summary:
      "Invalid, unmapped, transformed, or censored color/fill values render with the configured unknown color (count in message).",
  },
  "style-temporal-censored": {
    summary: "A temporal numeric style parser censored invalid source values by explicit request.",
  },
  "style-na-values": {
    summary: "Missing mapped style values use the configured NA output.",
  },
  "style-unknown-values": {
    summary: "Invalid or out-of-domain mapped style values use the configured unknown output.",
  },
  "style-palette-exhausted": {
    summary: "A finite style range cycled after explicit author opt-in.",
  },
  "style-fingerprint-mismatch": {
    summary: "Restored style state used a different output range; assignments start fresh.",
  },
  "style-version-mismatch": {
    summary: "Restored style state has an unknown schema version; assignments start fresh.",
  },
  "style-out-of-domain": {
    summary: "Values outside an explicit style domain use the unknown output.",
  },
  "invalid-label-format": {
    summary: "A labels format string was not recognized; the default format is used.",
  },
  "unknown-edition": {
    summary:
      "The spec targets a defaults edition this build does not know; the latest known edition's defaults are used.",
  },
  "color-on-fill-geom": {
    summary:
      "The color channel is mapped on a fill-styled geom (bar/col/area); fill is what varies.",
  },
  "weight-unsupported": {
    summary: "aes.weight is mapped on a stat that does not consume weights.",
  },
  "density-group-dropped": {
    summary: "A density group had too few finite values and was dropped.",
  },
  "smooth-group-dropped": {
    summary: "A smooth group had too few points for the fit and was dropped.",
  },
  "palette-exhausted": {
    summary:
      "A discrete color scale ran out of palette entries and cycled (the default onExhaust).",
  },
  "fingerprint-mismatch": {
    summary: "Restored scale state was trained on a different palette; assignments start fresh.",
  },
  "version-mismatch": {
    summary: "Restored scale state has an unknown schema version; assignments start fresh.",
  },
  "out-of-domain": {
    summary: "Values outside an explicit scale domain render the unknown color (deduplicated).",
  },
  "temporal-values-censored": {
    summary: "An explicit temporal parser censored invalid source values by author request.",
  },
  "guide-auto-bottom": {
    summary: "An auto-positioned guide moved below the panel to preserve readable width.",
  },
  "unused-scale-option": {
    summary: "A lower-precedence scale option was ignored in favor of an explicit winner.",
  },
  "temporal-label-overlap": {
    summary: "Authored or exhausted automatic temporal labels overlap at the available extent.",
  },
  "temporal-label-margin-overflow": {
    summary: "A complete temporal label exceeds the bounded axis margin.",
  },
  "temporal-break-outside-domain": {
    summary: "One or more explicit temporal breaks were outside the trained domain and omitted.",
  },
  "band-label-overlap": {
    summary: "Categorical (band) axis labels overlap even after wrapping and rotation.",
  },
  "band-label-margin-overflow": {
    summary:
      "A band label is truncated (ellipsis) to fit a bounded axis margin — a rotated label past the bottom cap, or a single-line end label past the side cap.",
  },
  "coord-tessellation-cap": {
    summary:
      "Adaptive coordinate tessellation reached a deterministic depth/vertex cap and retained a bounded approximation.",
  },
  "coord-invalid-geometry": {
    summary:
      "Path vertices outside a coordinate transform's domain were removed without bridging the remaining finite runs.",
  },
} as const satisfies Record<string, { summary: string }>;

export type PipelineWarningCode = keyof typeof PIPELINE_WARNING_CATALOG;

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
