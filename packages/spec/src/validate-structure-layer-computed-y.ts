/**
 * computed-y-mapped structural checks for geoms/stats that own y.
 * Orchestrated by validate-structure-layers.ts.
 *
 * Each geom/stat family is checked independently (same as the pre-split
 * sequential ifs) so an odd pairing can still emit more than one error.
 */
import type { SpecError } from "./errors.js";
import type { ChannelName } from "./schema.js";

/** Reject data-mapped y when the geom/stat computes y. */
export function computedYMappedErrors(
  geom: string,
  stat: string,
  layerPath: string,
  mapped: (channel: ChannelName) => unknown,
): SpecError[] {
  const errors: SpecError[] = [];
  const y = mapped("y");
  if (y === undefined || "stat" in y) return errors;

  if (
    geom === "bar" ||
    geom === "histogram" ||
    geom === "freqpoly" ||
    (geom === "line" && stat === "bin")
  ) {
    errors.push({
      code: "computed-y-mapped",
      path: `${layerPath}/aes/y`,
      message: `The ${geom} geom computes y with the ${stat} stat, so aes.y must not map data. Use geom "col" for pre-computed heights, or unset y with null.`,
      fix: {
        description: 'Switch the layer to geom "col" (identity stat) to draw mapped y values.',
        example: { geom: "col" },
      },
    });
  }

  if (geom === "density") {
    errors.push({
      code: "computed-y-mapped",
      path: `${layerPath}/aes/y`,
      message:
        "The density geom computes y with the density stat, so aes.y must not map data. Map only x, or unset y with null.",
      fix: {
        description: "Remove the y mapping (or unset an inherited one with null).",
        example: { geom: "density", aes: { y: null } },
      },
    });
  }

  if (geom === "function" || stat === "function") {
    errors.push({
      code: "computed-y-mapped",
      path: `${layerPath}/aes/y`,
      message:
        "The function geom/stat computes y from the named function, so aes.y must not map data. Unset y with null.",
      fix: {
        description: "Remove the y mapping (or unset an inherited one with null).",
        example: { geom: "function", aes: { y: null }, params: { fun: "dnorm", xlim: [-3, 3] } },
      },
    });
  }

  if (geom === "dotplot" || stat === "bindot") {
    errors.push({
      code: "computed-y-mapped",
      path: `${layerPath}/aes/y`,
      message:
        "The dotplot geom computes y stack positions with the bindot stat, so aes.y must not map data. Map only x, or unset y with null.",
      fix: {
        description: "Remove the y mapping (or unset an inherited one with null).",
        example: { geom: "dotplot", aes: { y: null } },
      },
    });
  }

  if (geom === "line" && stat === "ecdf") {
    errors.push({
      code: "computed-y-mapped",
      path: `${layerPath}/aes/y`,
      message:
        'The ecdf stat computes y (cumulative proportion), so aes.y must not map data. Map only x, or use y: { stat: "ecdf" }.',
      fix: {
        description: 'Remove the y mapping (or set y: { stat: "ecdf" }).',
        example: { geom: "line", stat: "ecdf", aes: { y: null } },
      },
    });
  }

  return errors;
}
