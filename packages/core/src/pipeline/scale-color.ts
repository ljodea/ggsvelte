/**
 * Color/fill scale resolution (ordinal value-stable + sequential ramps).
 */
import type { ColorScaleSpec } from "@ggsvelte/spec";

import type { ScaleState } from "../scales/state.js";
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";
import type { EditionDefaults } from "../editions.js";

import { resolveOrdinalColorScale } from "./scale-color-ordinal.js";
import { resolveSequentialColorScale } from "./scale-color-sequential.js";
import type { ColorResolution } from "./scale-color-types.js";
import type { Advisory, LayerFrame, PipelineWarning } from "./types.js";

export type { ColorResolution } from "./scale-color-types.js";

export function resolveColorScale(
  name: "color" | "fill",
  frames: readonly LayerFrame[],
  table: ColumnTable,
  config: ColorScaleSpec | undefined,
  prevState: ScaleState | null,
  legendTitle: string,
  warnings: PipelineWarning[],
  advisories: Advisory[],
  editionDefaults: EditionDefaults,
): ColorResolution {
  const values: CellValue[] = [];
  let anyDiscreteField = false;
  let anyField = false;
  for (const frame of frames) {
    const channel = name === "color" ? frame.binding.color : frame.binding.fill;
    const frameValues = name === "color" ? frame.colorValues : frame.fillValues;
    if (channel.field !== null && frameValues !== null) {
      anyField = true;
      if (table.has(channel.field) && table.discreteness(channel.field) === "discrete") {
        anyDiscreteField = true;
      }
      for (const v of frameValues) values.push(v);
    }
    if (channel.scaledConstant !== null) {
      anyDiscreteField = true;
      anyField = true;
      values.push(channel.scaledConstant);
    }
  }
  if (!anyField) return { resolved: null, legendInput: null, state: null };

  const type = config?.type ?? (anyDiscreteField ? "ordinal" : "sequential");

  if (type === "sequential") {
    return resolveSequentialColorScale({
      name,
      values,
      anyDiscreteField,
      config,
      legendTitle,
      warnings,
      advisories,
      editionDefaults,
    });
  }

  return resolveOrdinalColorScale({
    name,
    values,
    config,
    prevState,
    legendTitle,
    warnings,
    advisories,
    editionDefaults,
  });
}
