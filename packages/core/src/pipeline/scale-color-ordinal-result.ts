/**
 * Pack ordinal ColorScale into ColorResolution + palette-inferred advisory.
 */
import type { ColorScaleSpec } from "@ggsvelte/spec";
import type { ColorScale } from "../scales/train.js";
import type { CellValue } from "../table.js";

import type { ColorResolution } from "./scale-color-types.js";
import type { Advisory, PipelineWarning } from "./types.js";

export function ordinalColorResolution(input: {
  name: "color" | "fill";
  values: readonly CellValue[];
  config: ColorScaleSpec | undefined;
  legendTitle: string;
  scale: ColorScale;
  warnings: PipelineWarning[];
  advisories: Advisory[];
}): ColorResolution {
  const { name, values, config, legendTitle, scale, warnings, advisories } = input;
  for (const w of scale.warnings) warnings.push({ code: w.code, message: w.message });
  if (config?.scheme === undefined && config?.range === undefined) {
    advisories.push({
      code: "palette-inferred",
      path: `scales.${name}`,
      chosen: "categorical 10-color palette (value-stable assignment)",
      howToOverride: `Set scales.${name}.scheme, scales.${name}.range, or scales.${name}.domain.`,
    });
  }
  return {
    resolved: { kind: "ordinal", scale },
    legendInput: {
      kind: "discrete",
      scale: name,
      title: legendTitle,
      domain: scale.domain,
      firstSeen: values,
      colorOf: (v: unknown) => scale.colorOf(v),
    },
    state: scale.state,
  };
}
