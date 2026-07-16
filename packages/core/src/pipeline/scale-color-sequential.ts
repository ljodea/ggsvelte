/**
 * Sequential color/fill scale training and ramp legend input.
 */
import type { ColorScaleSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import { numberFormatter } from "../layout/format.js";
import { defaultTickFormat, tickStep } from "../layout/ticks.js";
import { trainSequential, VIRIDIS_RAMP_10 } from "../scales/color.js";
import { finiteExtent } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { cellsToNumeric, cellToNumber } from "../table.js";

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
  const domain = config?.domain;
  const sequentialDomain =
    domain !== undefined && domain.length === 2
      ? ([cellToNumber(domain[0] as CellValue), cellToNumber(domain[1] as CellValue)] as [
          number,
          number,
        ])
      : undefined;
  // Edition-keyed default ramp: identical to the trainSequential built-in
  // for edition 1 (pass nothing — keeps behavior byte-stable); a different
  // edition's ramp is passed explicitly. Explicit config always wins.
  const editionRamp =
    editionDefaults.sequentialRamp === VIRIDIS_RAMP_10 ? undefined : editionDefaults.sequentialRamp;
  const range = config?.range ?? editionRamp;
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
  return {
    resolved: { kind: "sequential", scale },
    legendInput: {
      kind: "ramp",
      scale: name,
      title: legendTitle,
      domain: scale.domain,
      at: (t: number) => scale.at(t),
      format,
    },
    state: null,
  };
}
