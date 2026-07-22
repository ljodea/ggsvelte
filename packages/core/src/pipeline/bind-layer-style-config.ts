/** Attach authored family intent used by pre-stat default grouping. */
import type { PortableSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { styleBinExtent } from "./frame-group-columns.js";
import type { LayerBinding } from "./types.js";

const STYLE_AESTHETICS = ["size", "linewidth", "alpha", "shape", "linetype"] as const;

export function configureStyleBindings(
  binding: LayerBinding,
  scales: PortableSpec["scales"] | undefined,
  table?: ColumnTable,
): void {
  for (const aesthetic of STYLE_AESTHETICS) {
    const config = scales?.[aesthetic];
    const type = config?.type;
    const style = binding[aesthetic];
    style.forcedDiscrete =
      aesthetic === "shape" ||
      aesthetic === "linetype" ||
      type === "ordinal" ||
      type === "manual" ||
      type === "binned";
    style.forcedContinuous =
      aesthetic !== "shape" &&
      aesthetic !== "linetype" &&
      (type === "sequential" || type === "identity");
    style.binned = type === "binned";
    const breaks = config?.breaks;
    if (breaks !== undefined) style.binBreaks = breaks;
    const domain = config?.domain;
    if (domain !== undefined) style.binDomain = domain;
    if (
      config !== undefined &&
      ("temporalKind" in config ||
        "parse" in config ||
        "timezone" in config ||
        "disambiguation" in config)
    ) {
      style.binTemporal =
        config.temporalKind !== undefined ||
        config.parse !== undefined ||
        config.timezone !== undefined ||
        config.disambiguation !== undefined;
      if (config.parse !== undefined) style.binParse = config.parse;
      if (config.timezone !== undefined) style.binTimezone = config.timezone;
      if (config.disambiguation !== undefined) style.binDisambiguation = config.disambiguation;
    }
    if (config !== undefined && "oob" in config && config.oob !== undefined) {
      style.binOob = config.oob;
    }
    const range = config?.range;
    if (type === "binned" && (aesthetic === "shape" || aesthetic === "linetype")) {
      const defaultLength = aesthetic === "shape" ? 6 : 5;
      style.binCount = Math.min(range?.length ?? defaultLength, 5);
    }
    // Capture the global bin extent before faceting so per-panel grouping bins
    // match the globally-trained style scale. Only needed when the user did not
    // author explicit breaks/domain (those already pin the extent).
    if (type === "binned" && breaks === undefined && domain === undefined && table !== undefined) {
      const extent = styleBinExtent(style, table);
      if (extent !== undefined) style.binExtent = extent;
    }
  }
}
