/**
 * Color/fill scale resolution (ordinal value-stable + sequential ramps).
 */
import type { ColorScaleSpec } from "@ggsvelte/spec";

import type { ScaleState } from "../scales/state.js";
import type { ColumnTable } from "../table.js";
import type { EditionDefaults } from "../editions.js";

import { collectColorChannelValues } from "./scale-color-collect.js";
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
  const { values, anyDiscreteField, anyField } = collectColorChannelValues(name, frames, table);
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
