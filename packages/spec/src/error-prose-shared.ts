/**
 * Shared summary/fix prose for diagnostic codes that both validation
 * (ERROR_CATALOG) and the pipeline (PIPELINE_ERROR_CATALOG) can emit.
 * One object per code — import into both catalogs so the strings cannot drift.
 *
 * #987: missing-channel vs missing-required-channel is intentionally NOT
 * merged here (different public code strings; one rename per change).
 */

/** Prose body shared by dual-channel error codes. */
export interface SharedErrorProse {
  summary: string;
  fix: string;
}

/**
 * Dual-channel codes and their single prose source.
 * Keep keys sorted; scripts/error-catalog-shared-prose.test.ts pins membership.
 */
export const DUAL_ERROR_PROSE = {
  "all-null-column": {
    summary: "A mapped column contains only null values.",
    fix: "Map the channel to a column with actual values, or fix the data.",
  },
  "bin-center-and-boundary": {
    summary: "A bin-stat layer sets BOTH params.center and params.boundary.",
    fix: "Keep one bin-grid alignment parameter and remove the other.",
  },
  "channel-type-mismatch": {
    summary:
      "A mapped field's type is incompatible with the layer's geom/stat (e.g. a nominal x on smooth/bin/density, a continuous x on boxplot).",
    fix: "Map a field of the type the geom/stat needs, or switch to a geom that fits the field (the message suggests one).",
  },
  "color-manual-domain-range": {
    summary: "A manual color/fill scale has a different number of domain values and range colors.",
    fix: "Provide exactly one range color for every domain value.",
  },
  "computed-y-mapped": {
    summary: "A layer whose stat computes y (count, bin, density) maps aes.y to a data field.",
    fix: 'Unset y with null — or, for pre-computed bar heights, switch the layer to geom "col".',
  },
  "coord-fixed-free-scales": {
    summary: "Fixed-aspect coordinates cannot represent free positional facet scales truthfully.",
    fix: 'Use facet.scales = "fixed", or remove coord_fixed / coord_sf.',
  },
  "facet-form-ambiguous": {
    summary: "A facet sets BOTH the wrap form and the rows/cols grid form.",
    fix: "Keep facet.wrap (and drop rows/cols), or keep rows/cols (and drop wrap).",
  },
  "facet-form-missing": {
    summary: "A facet sets neither wrap nor rows/cols — nothing to partition by.",
    fix: "Set facet.wrap (wrap form) or facet.rows/facet.cols (grid form).",
  },
  "guide-aesthetic-incompatible": {
    summary: "A guide variant is incompatible with its aesthetic or trained scale family.",
    fix: "Use axis for x/y, legend for discrete/style scales, colorbar for sequential color, or colorsteps for binned color.",
  },
  "manual-fun-required": {
    summary: "A layer uses stat manual without params.fun.",
    fix: "Set params.fun to one of first|last|mean|median|min|max|sum (portable named registry; #814).",
  },
  "summary-rolling-window-required": {
    summary: "A layer uses stat summary_rolling without params.window.",
    fix: "Set params.window to the rolling-window width in x data units (greater than 0).",
  },
  "ribbon-orientation-ambiguous": {
    summary:
      "A ribbon layer maps both x-orientation (x+ymin+ymax) and y-orientation (y+xmin+xmax) contracts without params.orientation.",
    fix: 'Set params.orientation to "x" or "y", or map only one complete interval contract.',
  },
  "rule-both-axes": {
    summary: "A data-driven rule layer maps BOTH aes.x and aes.y (pick one direction).",
    fix: "Keep one direction (vertical: map x; horizontal: map y) and unset the other with null.",
  },
  "rule-form-ambiguous": {
    summary:
      "A rule layer mixes the annotation form (params.xintercept/yintercept) with mapped aes.x/aes.y.",
    fix: "Use fixed intercepts OR a data mapping, never both (unset the other with null).",
  },
  "rule-form-missing": {
    summary:
      "A rule layer has neither intercept params nor a mapped aes.x/aes.y — nothing to draw.",
    fix: "Set params.yintercept/xintercept (annotation) or map aes.x/aes.y (data-driven).",
  },
  "scale-type-transform-conflict": {
    summary:
      'A scale declares an incompatible type/family with its transform (temporal/discrete/manual/identity with a non-identity transform, or type: "log" with a non-log10 transform).',
    fix: 'Use identity for temporal/discrete/manual/identity scales; for base-10 log use type: "linear" with transform: "log10"; or choose a quantitative family that admits the transform.',
  },
  "unknown-field": {
    summary: "A channel maps a field that does not exist in the data.",
    fix: "Map the channel to one of the available fields (the error lists them, with a did-you-mean).",
  },
  "unknown-stat-column": {
    summary: "A { stat } channel names a column the layer's stat does not generate.",
    fix: "Use one of the columns the stat generates (the error lists them), or change the layer's stat.",
  },
  "unsupported-geom-aesthetic": {
    summary: "A mapped style aesthetic is not consumed by the selected geom.",
    fix: "Remove the mapping or move it to one of the compatible geoms listed in the error.",
  },
} as const satisfies Record<string, SharedErrorProse>;
