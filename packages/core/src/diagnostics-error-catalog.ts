/**
 * Pipeline error catalog — structured errors thrown as
 * `PipelineError { code, path, message }`. Pure data; re-exported from
 * diagnostics.ts.
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
    summary: "A layer has neither plot-level data nor its own layer.data.",
    fix: "Set spec.data and/or layer.data ({values}, {columns}, or {name}), or pass named data via RunOptions.data.",
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
  "coord-fixed-free-scales": {
    summary: "Fixed-aspect coordinates were combined with free positional facet scales.",
    fix: 'Use facet.scales = "fixed", or remove coord_fixed.',
  },
  "coord-fixed-invalid-aspect": {
    summary:
      "A fixed-aspect target or fitted data rectangle is non-finite or non-positive after chrome is allocated.",
    fix: "Use a moderate finite ratio and non-degenerate positional domains, or enlarge the plot allocation.",
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
  "manual-fun-required": {
    summary: "A layer uses stat manual without params.fun.",
    fix: "Set params.fun to one of first|last|mean|median|min|max|sum (portable named registry; #814).",
  },
  "manual-fun-unknown": {
    summary:
      "A layer uses stat manual with an unregistered params.fun (defense for unvalidated specs).",
    fix: "Use a registered name: first, last, mean, median, min, max, sum.",
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
  "map-data-required": {
    summary: "geom_map was used without params.map.",
    fix: "Pass params.map as { values }, { columns }, or { name } against spec.datasets.",
  },
  "map-coords-missing": {
    summary: "Map data is missing long/lat or x/y coordinate columns.",
    fix: 'Provide "long"+"lat" or "x"+"y" columns in the fortified map table.',
  },
  "map-id-column-missing": {
    summary: "Map data is missing a region join column.",
    fix: 'Set params.mapId or include a "region" / "id" column in the map table.',
  },
} as const satisfies Record<string, PipelineErrorCatalogEntry>;

export type PipelineErrorCode = keyof typeof PIPELINE_ERROR_CATALOG;
