/**
 * Sequential color/fill scale training and ramp legend input.
 */
import type { ColorScaleSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import { trainSequential } from "../scales/color.js";
import { finiteExtent } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { cellsToNumeric } from "../table.js";

import {
  resolveSequentialDomain,
  resolveSequentialRange,
} from "./scale-color-sequential-domain.js";
import { resolveSequentialLegendFormat } from "./scale-color-sequential-format.js";
import { sequentialColorResolution } from "./scale-color-sequential-result.js";
import type { ColorResolution } from "./scale-color-types.js";
import type { Advisory, PipelineWarning } from "./types.js";

export function resolveSequentialColorScale(input: {
  name: "color" | "fill";
  values: readonly CellValue[];
  anyDiscreteField: boolean;
  config: ColorScaleSpec | undefined;
  legendTitle: string;
  warnings: PipelineWarning[];
  advisories: Advisory[];
  editionDefaults: EditionDefaults;
}): ColorResolution {
  const {
    name,
    values,
    anyDiscreteField,
    config,
    legendTitle,
    warnings,
    advisories,
    editionDefaults,
  } = input;

  if (anyDiscreteField) {
    warnings.push({
      code: "sequential-discrete-field",
      message: `The ${name} scale is sequential but a mapped field is discrete; values that do not parse as numbers render the unknown color.`,
    });
  }
  const numeric = cellsToNumeric(values);
  const extent = finiteExtent([numeric]);
  const sequentialDomain = resolveSequentialDomain(config);
  const range = resolveSequentialRange(config, editionDefaults);
  const scale = trainSequential(extent, {
    ...(sequentialDomain !== undefined && { domain: sequentialDomain }),
    ...(range !== undefined && { range }),
    ...(config?.reverse !== undefined && { reverse: config.reverse }),
  });
  if (config?.scheme === undefined && config?.range === undefined) {
    advisories.push({
      code: "palette-inferred",
      path: `scales.${name}`,
      chosen: "sequential viridis ramp",
      howToOverride: `Set scales.${name}.range (ramp stops) or scales.${name}.domain.`,
    });
  }
  const format = resolveSequentialLegendFormat(scale, config, name, warnings);
  return sequentialColorResolution(name, legendTitle, scale, format);
}
