export const SCALE_CAPABILITIES = [
  {
    family: "position-continuous",
    aesthetics: ["x", "y"],
    scaleTypes: ["linear", "log"],
    runtime: "implemented",
    helpers: [] as const,
  },
  {
    family: "position-temporal",
    aesthetics: ["x", "y"],
    scaleTypes: ["time"],
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
    runtime: "implemented",
    helpers: ["scaleXDiscrete", "scaleYDiscrete", "scale_x_discrete", "scale_y_discrete"],
  },
  {
    family: "color-fill",
    aesthetics: ["color", "fill"],
    scaleTypes: ["ordinal", "sequential"],
    runtime: "implemented",
    helpers: [] as const,
  },
  {
    family: "mapped-style-reserved",
    aesthetics: ["size", "linewidth", "alpha"],
    scaleTypes: [] as const,
    runtime: "schema-only",
    helpers: [] as const,
  },
] as const;

export type ScaleCapability = (typeof SCALE_CAPABILITIES)[number];
