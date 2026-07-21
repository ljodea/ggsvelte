/**
 * Checked public capability ledger.
 *
 * `scaleTypes` are the CANONICAL post-normalize scale families a runtime
 * implements. `authoredAliases` are accepted authoring spellings that
 * `normalize()` rewrites into a canonical family (e.g. `type: "log"` becomes
 * `{ type: "linear", transform: "log10" }`) — they never re-appear in
 * `scaleTypes`. `transforms` are the pre-stat position transforms the family
 * supports. `helpers` are the exported camelCase + ggplot2 snake_case helpers.
 *
 * `packages/spec/tests/capabilities.test.ts` cross-validates this ledger:
 * every claimed helper is a real package-root export with binding-identical
 * aliases, normalizes to its declared family, and surfaces in generated docs.
 */
export const SCALE_CAPABILITIES = [
  {
    family: "position-continuous",
    aesthetics: ["x", "y"],
    scaleTypes: ["linear"],
    transforms: ["identity", "log10", "sqrt"],
    authoredAliases: ["log"],
    runtime: "implemented",
    helpers: [
      "scaleXContinuous",
      "scaleYContinuous",
      "scaleXLog10",
      "scaleYLog10",
      "scaleXSqrt",
      "scaleYSqrt",
      "scaleXReverse",
      "scaleYReverse",
      "scale_x_continuous",
      "scale_y_continuous",
      "scale_x_log10",
      "scale_y_log10",
      "scale_x_sqrt",
      "scale_y_sqrt",
      "scale_x_reverse",
      "scale_y_reverse",
    ],
  },
  {
    family: "position-binned",
    aesthetics: ["x", "y"],
    scaleTypes: ["binned"],
    transforms: ["identity", "log10", "sqrt"],
    authoredAliases: [] as const,
    runtime: "implemented",
    helpers: ["scaleXBinned", "scaleYBinned", "scale_x_binned", "scale_y_binned"],
  },
  {
    family: "position-temporal",
    aesthetics: ["x", "y"],
    scaleTypes: ["time"],
    transforms: ["identity"],
    authoredAliases: [] as const,
    runtime: "implemented",
    helpers: [
      "scaleXDate",
      "scaleXDatetime",
      "scaleYDate",
      "scaleYDatetime",
      "scale_x_date",
      "scale_x_datetime",
      "scale_y_date",
      "scale_y_datetime",
    ],
  },
  {
    family: "position-discrete",
    aesthetics: ["x", "y"],
    scaleTypes: ["band"],
    transforms: [] as const,
    authoredAliases: [] as const,
    runtime: "implemented",
    helpers: ["scaleXDiscrete", "scaleYDiscrete", "scale_x_discrete", "scale_y_discrete"],
  },
  {
    family: "color-fill",
    aesthetics: ["color", "fill"],
    scaleTypes: ["ordinal", "sequential"],
    transforms: [] as const,
    authoredAliases: [] as const,
    runtime: "implemented",
    helpers: [] as const,
  },
  {
    family: "mapped-style-reserved",
    aesthetics: ["size", "linewidth", "alpha"],
    scaleTypes: [] as const,
    transforms: [] as const,
    authoredAliases: [] as const,
    runtime: "schema-only",
    helpers: [] as const,
  },
] as const;

export type ScaleCapability = (typeof SCALE_CAPABILITIES)[number];
