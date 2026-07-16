/**
 * Sequential color legend label format resolution.
 */
import type { ColorScaleSpec } from "@ggsvelte/spec";

import { numberFormatter } from "../layout/format.js";
import { defaultTickFormat, tickStep } from "../layout/ticks.js";
import type { SequentialColorScale } from "../scales/color.js";

import type { PipelineWarning } from "./types.js";

export function resolveSequentialLegendFormat(
  scale: SequentialColorScale,
  config: ColorScaleSpec | undefined,
  name: "color" | "fill",
  warnings: PipelineWarning[],
): (v: number) => string {
  const labelFormat = config?.labels;
  let format = defaultTickFormat(tickStep(scale.domain[0], scale.domain[1], 5));
  if (labelFormat !== undefined) {
    const f = numberFormatter(labelFormat);
    if (f.ok) {
      format = (v: number) => f.format(v);
    } else {
      warnings.push({
        code: "invalid-label-format",
        message: `Unrecognized labels format "${labelFormat}" on scales.${name}; using the default.`,
      });
    }
  }
  return format;
}
