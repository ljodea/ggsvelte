/**
 * Validation error catalog — stable codes for agent diagnostics and docs.
 * Pure data: zero runtime imports. SpecError instance types and didYouMean
 * live in errors.ts.
 */

/** One entry of the validation error catalog (docs render straight from it). */
export interface ErrorCatalogEntry {
  /** 1 = schema shape / structural (no data needed); 2 = data-aware (opt-in). */
  tier: 1 | 2;
  /** What went wrong, in one sentence. */
  summary: string;
  /** How to fix it, prescriptively (instances carry a concrete fix.example). */
  fix: string;
}

/**
 * The stable catalog of validation error codes — THE single source for the
 * docs error-reference page and llms-full.txt. Audited M3: every code has a
 * prescriptive summary + fix; near-duplicates were merged (`bar-y-mapped`
 * folded into `computed-y-mapped` — same grammar rule, geom-aware message);
 * a coverage test asserts every code is exercised by a snapshot test.
 */
export const ERROR_CATALOG = {
  // --- tier 1 (schema shape, no data needed) -------------------------------
  "invalid-spec-root": {
    tier: 1,
    summary: "The spec is not a JSON object.",
    fix: 'Provide an object with at least one layer: {"layers": [{"geom": "point", ...}]}.',
  },
  "missing-layers": {
    tier: 1,
    summary: "`layers` is missing or not an array.",
    fix: "Add a layers array with at least one layer object.",
  },
  "empty-layers": {
    tier: 1,
    summary: "`layers` is present but empty (a plot needs at least one layer).",
    fix: 'Add a layer, e.g. {"geom": "point"}.',
  },
  "invalid-layer": {
    tier: 1,
    summary: "A layer is not an object.",
    fix: 'Replace the entry with a layer object carrying a "geom".',
  },
  "missing-geom": {
    tier: 1,
    summary: 'A layer has no "geom" discriminator.',
    fix: 'Add a geom name to the layer, e.g. {"geom": "point"}.',
  },
  "unknown-geom": {
    tier: 1,
    summary: 'A layer\'s "geom" is not a known geom name.',
    fix: "Use one of the allowed geoms (the error lists them, with a did-you-mean).",
  },
  "invalid-channel-value": {
    tier: 1,
    summary:
      "A channel value is not one of the canonical forms {field}/{value}/{stat}/null (bare strings are builder-only shorthand).",
    fix: 'Wrap field mappings as {"field": "column_name"} and constants as {"value": ...}.',
  },
  "unexpected-property": {
    tier: 1,
    summary: "An object carries a property the schema does not allow.",
    fix: "Remove or rename the property (the error suggests the closest allowed name).",
  },
  "missing-property": {
    tier: 1,
    summary: "A required property is missing.",
    fix: "Add the named property.",
  },
  "invalid-enum-value": {
    tier: 1,
    summary: "A value is outside its declared enum/literal set.",
    fix: "Use one of the allowed values (the error lists them, with a did-you-mean).",
  },
  "value-out-of-range": {
    tier: 1,
    summary: "A numeric value is outside its declared bounds.",
    fix: "Set the value inside the bounds stated by the error message.",
  },
  "invalid-data": {
    tier: 1,
    summary: "`data` (or a dataset entry) matches none of the data forms.",
    fix: 'Use {"values": [...rows]}, {"columns": {...arrays}}, or {"name": "dataset"}.',
  },
  "invalid-type": {
    tier: 1,
    summary: "Fallback: a value has the wrong JSON type.",
    fix: "Give the property the JSON type the message names.",
  },
  "scale-scheme-type": {
    tier: 1,
    summary: "A named color scheme is incompatible with the configured color scale type.",
    fix: 'Use a categorical scheme with "ordinal", or "viridis"/hex stops with "sequential".',
  },
  "scale-range-color": {
    tier: 1,
    summary: "A custom color range contains a color outside the supported hex syntax.",
    fix: "Replace each custom color with #rgb or #rrggbb syntax.",
  },
  "scale-type-transform-conflict": {
    tier: 1,
    summary: "A scale family is incompatible with its requested transform.",
    fix: "Use identity for temporal/discrete/manual/identity scales, or choose a quantitative family.",
  },
  "scale-manual-domain-range": {
    tier: 1,
    summary: "A manual color scale has different domain and range lengths.",
    fix: "Provide exactly one range color for each explicit domain value.",
  },
  // --- tier 1 structural (grammar rules the schema alone cannot express) ---
  "missing-required-channel": {
    tier: 2,
    summary: "A geom is missing a required aesthetic channel (x, y, label, ...).",
    fix: "Map the named channel to a data field in the layer's aes or the plot-level aes.",
  },
  "rule-form-ambiguous": {
    tier: 2,
    summary:
      "A rule layer mixes the annotation form (params.xintercept/yintercept) with mapped aes.x/aes.y.",
    fix: "Use fixed intercepts OR a data mapping, never both (unset the other with null).",
  },
  "rule-form-missing": {
    tier: 2,
    summary: "A rule layer has neither intercept params nor a mapped aes.x/aes.y.",
    fix: "Set params.yintercept/xintercept (annotation) or map aes.x/aes.y (data-driven).",
  },
  "rule-both-axes": {
    tier: 2,
    summary: "A data-driven rule layer maps BOTH aes.x and aes.y (pick one direction).",
    fix: "Keep one direction (vertical: map x; horizontal: map y) and unset the other with null.",
  },
  "computed-y-mapped": {
    tier: 2,
    summary: "A layer whose stat computes y (count, bin, density) maps aes.y to a data field.",
    fix: 'Unset y with null — or, for pre-computed bar heights, switch the layer to geom "col".',
  },
  "bin-center-and-boundary": {
    tier: 2,
    summary: "A bin-stat layer sets BOTH params.center and params.boundary.",
    fix: "Keep one bin-grid alignment parameter and remove the other.",
  },
  "facet-form-ambiguous": {
    tier: 2,
    summary: "A facet sets BOTH the wrap form and the rows/cols grid form.",
    fix: "Keep facet.wrap (and drop rows/cols), or keep rows/cols (and drop wrap).",
  },
  "facet-form-missing": {
    tier: 2,
    summary: "A facet sets neither wrap nor rows/cols — nothing to partition by.",
    fix: "Set facet.wrap (wrap form) or facet.rows/facet.cols (grid form).",
  },
  "facet-ncol-without-wrap": {
    tier: 2,
    summary: "facet.ncol only applies to the wrap form.",
    fix: "Remove ncol, or switch to the wrap form.",
  },
  "unsupported-geom-aesthetic": {
    tier: 2,
    summary: "A mapped style aesthetic is not consumed by the selected geom.",
    fix: "Remove the mapping or move it to one of the compatible geoms listed in the error.",
  },
  // --- tier 2 (data-aware; needs inline data or a DataProfile) -------------
  "unknown-field": {
    tier: 2,
    summary: "A channel maps a field that does not exist in the data.",
    fix: "Map the channel to one of the available fields (the error lists them, with a did-you-mean).",
  },
  "all-null-column": {
    tier: 2,
    summary: "A mapped column contains only null values.",
    fix: "Map the channel to a column with actual values, or fix the data.",
  },
  "scale-type-mismatch": {
    tier: 2,
    summary: "A configured scale type is incompatible with the mapped field's type.",
    fix: "Change the scale type to match the field (band for categories, time for temporal), or map a compatible field.",
  },
  "channel-type-mismatch": {
    tier: 2,
    summary:
      "A mapped field's type is incompatible with the layer's geom/stat (e.g. a nominal x on smooth/bin/density, a continuous x on boxplot).",
    fix: "Map a field of the type the geom/stat needs, or switch to a geom that fits the field (the message suggests one).",
  },
  "unknown-stat-column": {
    tier: 2,
    summary: "A { stat } channel names a column the layer's stat does not generate.",
    fix: "Use one of the columns the stat generates (the error lists them), or change the layer's stat.",
  },
  "invalid-data-profile": {
    tier: 2,
    summary: "The provided DataProfile is malformed.",
    fix: 'Provide { fields: [{ name, type: "quantitative"|"temporal"|"ordinal"|"nominal" }], rowCount? }.',
  },
  "validation-limit": {
    tier: 2,
    summary: "Validation input exceeded a documented limit (rows/bytes/depth/diagnostics).",
    fix: "Validate with a DataProfile instead of huge inline data, or raise the limit via options.limits.",
  },
} as const satisfies Record<string, ErrorCatalogEntry>;

export type SpecErrorCode = keyof typeof ERROR_CATALOG;

/** The stable list of validation error codes (keys of ERROR_CATALOG). */
export const ERROR_CODES = Object.keys(ERROR_CATALOG) as readonly SpecErrorCode[];
