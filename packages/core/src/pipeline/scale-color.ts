/**
 * Color/fill scale resolution (ordinal value-stable + sequential ramps).
 */
import { configuredColorScaleType, type ColorScaleSpec } from "@ggsvelte/spec";

import type { ScaleState } from "../scales/state.js";
import type { ColumnTable } from "../table.js";
import type { EditionDefaults } from "../editions.js";

import { collectColorCatalogValues, collectColorChannelValues } from "./scale-color-collect.js";
import {
  resolveBinnedColorScale,
  resolveIdentityColorScale,
  resolveManualColorScale,
} from "./scale-color-families.js";
import { resolveOrdinalColorScale } from "./scale-color-ordinal.js";
import { resolveSequentialColorScale } from "./scale-color-sequential.js";
import type { ColorResolution } from "./scale-color-types.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export type { ColorResolution } from "./scale-color-types.js";

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
  const missingCount = values.filter((value) => value === null).length;
  if (missingCount > 0) {
    warnings.push({
      code: "color-na-values",
      message: `${String(missingCount)} ${name} value(s) use the NA color.`,
    });
  }
  const anyDiscreteField = collected.anyDiscreteField || catalog.anyDiscreteField;
  const anyField = collected.anyField || catalog.anyField;
  if (!anyField) return { resolved: null, legendInput: null, guidePlan: null, state: null };

  const type = configuredColorScaleType(config) ?? (anyDiscreteField ? "ordinal" : "sequential");

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

  if (type === "binned") {
    return resolveBinnedColorScale({
      name,
      values,
      config: config ?? { type: "binned" },
      legendTitle,
      warnings,
      editionDefaults,
    });
  }
  if (type === "manual") {
    return resolveManualColorScale({
      name,
      values: catalog.catalogValues.length > 0 ? catalog.catalogValues : values,
      observedValues: values,
      config: config ?? { type: "manual", range: [] },
      legendTitle,
      warnings,
    });
  }
  if (type === "identity") {
    return resolveIdentityColorScale({
      name,
      values,
      config: config ?? { type: "identity" },
      warnings,
    });
  }

  // Ordinal scales train on the unfiltered source catalog when available, so
  // categorical assignments stay stable while runtime filters change the rows.
  return resolveOrdinalColorScale({
    name,
    values: (catalog.catalogValues.length > 0 ? catalog.catalogValues : values).filter(
      (value) => value !== null,
    ),
    config,
    prevState,
    legendTitle,
    warnings,
    advisories,
    editionDefaults,
  });
}
