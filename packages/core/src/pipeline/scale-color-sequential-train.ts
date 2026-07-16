/**
 * Train a sequential color scale from values + config/edition range.
 */
import type { ColorScaleSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import { trainSequential, type SequentialColorScale } from "../scales/color.js";
import { finiteExtent } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { cellsToNumeric } from "../table.js";

import {
  resolveSequentialDomain,
  resolveSequentialRange,
} from "./scale-color-sequential-domain.js";
import type { Advisory, PipelineWarning } from "./types.js";

export function trainSequentialColorScale(input: {
  name: "color" | "fill";
  values: readonly CellValue[];
  anyDiscreteField: boolean;
  config: ColorScaleSpec | undefined;
  editionDefaults: EditionDefaults;
  warnings: PipelineWarning[];
  advisories: Advisory[];
}): SequentialColorScale {
  const { name, values, anyDiscreteField, config, editionDefaults, warnings, advisories } = input;

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
  return scale;
}
