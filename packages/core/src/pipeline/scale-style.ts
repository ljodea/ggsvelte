/** Training and semantic guide planning for mapped size/linewidth/alpha/shape/linetype. */
import type { PortableSpec, StyleAesthetic } from "@ggsvelte/spec";

import type { ScaleState } from "../scales/state.js";
import type { ColumnTable } from "../table.js";

import { collectStyleValues } from "./scale-style-collect.js";
import { resolveFiniteStyleScale } from "./scale-style-finite.js";
import { resolveNumericStyleScale } from "./scale-style-numeric.js";
import type { FiniteStyleConfig, StyleResolution } from "./scale-style-types.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export function resolveStyleScale(input: {
  aesthetic: StyleAesthetic;
  frames: readonly LayerFrame[];
  bindings: readonly LayerBinding[];
  table: ColumnTable;
  sourceTable: ColumnTable;
  config: NonNullable<PortableSpec["scales"]>[StyleAesthetic] | undefined;
  prevState: ScaleState | null;
  title: string;
  warnings: PipelineWarning[];
}): StyleResolution {
  const collected = collectStyleValues(input);
  const { aesthetic, config, prevState, title, warnings } = input;
  if (!collected.anyField) {
    return { aesthetic, resolved: null, legendInput: null, guidePlan: null, state: null };
  }
  const missingCount = collected.values.filter((value) => value === null).length;
  if (missingCount > 0) {
    warnings.push({
      code: "style-na-values",
      message: `${String(missingCount)} ${aesthetic} value(s) use the NA style.`,
    });
  }
  if (aesthetic === "shape" || aesthetic === "linetype") {
    return resolveFiniteStyleScale({
      aesthetic,
      values: collected.values,
      catalog: collected.catalog,
      anyDiscrete: collected.anyDiscrete,
      anyIndexable: collected.anyIndexable,
      nonInteractiveValues: collected.nonInteractiveValues,
      // Narrow PortableSpec's union scale entry to the finite (shape/linetype) config.
      config: config as FiniteStyleConfig | undefined,
      prevState,
      title,
      warnings,
    });
  }
  return resolveNumericStyleScale({
    aesthetic,
    values: collected.values,
    catalog: collected.catalog,
    anyDiscrete: collected.anyDiscrete,
    anyIndexable: collected.anyIndexable,
    nonInteractiveValues: collected.nonInteractiveValues,
    config,
    prevState,
    title,
    warnings,
  });
}
