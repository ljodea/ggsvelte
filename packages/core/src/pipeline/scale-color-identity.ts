/** Identity color/fill scale family (pass-through source colors). */
import type { ColorScaleSpec } from "@ggsvelte/spec";

import { normalizeColor } from "../scales/color.js";
import type { IdentityColorScale } from "../scales/non-position-color.js";
import type { CellValue } from "../table.js";

import { fallbackColors, warnUnknownColors } from "./scale-color-family-helpers.js";
import type { ColorResolution } from "./scale-color-types.js";
import type { PipelineWarning } from "./types.js";

export function resolveIdentityColorScale(input: {
  name: "color" | "fill";
  values: readonly CellValue[];
  config: ColorScaleSpec;
  warnings: PipelineWarning[];
}): ColorResolution {
  const { name, values, config, warnings } = input;
  const { naValue, unknownValue } = fallbackColors(config);
  const scale: IdentityColorScale = Object.freeze({
    type: "identity" as const,
    naValue,
    unknownValue,
    colorOf(value: unknown): string | undefined {
      if (value === null || value === undefined) return naValue;
      if (typeof value !== "string") return unknownValue;
      try {
        return normalizeColor(value);
      } catch {
        return unknownValue;
      }
    },
  });
  warnUnknownColors(
    name,
    values.filter(
      (value) =>
        value !== null &&
        (typeof value !== "string" || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)),
    ).length,
    warnings,
  );
  return {
    resolved: { kind: "identity", scale },
    legendInput: null,
    guidePlan: null,
    state: null,
  };
}
