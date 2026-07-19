/**
 * Color/fill scale resolution (ordinal value-stable + sequential ramps).
 */
import { SEQUENTIAL_SCHEME_NAMES, type ColorScaleSpec } from "@ggsvelte/spec";

import type { ScaleState } from "../scales/state.js";
import type { ColumnTable } from "../table.js";
import type { EditionDefaults } from "../editions.js";

import { collectColorCatalogValues, collectColorChannelValues } from "./scale-color-collect.js";
import { resolveOrdinalColorScale } from "./scale-color-ordinal.js";
import { resolveSequentialColorScale } from "./scale-color-sequential.js";
import type { ColorResolution } from "./scale-color-types.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export type { ColorResolution } from "./scale-color-types.js";

const SEQUENTIAL_SCHEMES = new Set<string>(SEQUENTIAL_SCHEME_NAMES);

export function resolveColorScale(
  name: "color" | "fill",
  frames: readonly LayerFrame[],
  bindings: readonly LayerBinding[],
  table: ColumnTable,
  catalogTable: ColumnTable,
  config: ColorScaleSpec | undefined,
  prevState: ScaleState | null,
  legendTitle: string,
  warnings: PipelineWarning[],
  advisories: Advisory[],
  editionDefaults: EditionDefaults,
): ColorResolution {
  const collected = collectColorChannelValues(name, frames, table);
  const catalog = collectColorCatalogValues(name, bindings, catalogTable);
  const values = collected.values;
  const anyDiscreteField = collected.anyDiscreteField || catalog.anyDiscreteField;
  const anyField = collected.anyField || catalog.anyField;
  if (!anyField) return { resolved: null, legendInput: null, state: null };

  const schemeType =
    config?.scheme === undefined
      ? undefined
      : SEQUENTIAL_SCHEMES.has(config.scheme)
        ? "sequential"
        : "ordinal";
  const type = config?.type ?? schemeType ?? (anyDiscreteField ? "ordinal" : "sequential");

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

  // Ordinal scales train on the unfiltered source catalog when available, so
  // categorical assignments stay stable while runtime filters change the rows.
  return resolveOrdinalColorScale({
    name,
    values: catalog.catalogValues.length > 0 ? catalog.catalogValues : values,
    config,
    prevState,
    legendTitle,
    warnings,
    advisories,
    editionDefaults,
  });
}
