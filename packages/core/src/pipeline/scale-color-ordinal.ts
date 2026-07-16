/**
 * Ordinal (value-stable categorical) color/fill scale training and discrete legend.
 */
import type { ColorScaleSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import type { ScaleState } from "../scales/state.js";
import { PaletteExhaustedError } from "../scales/state.js";
import type { ColorScale } from "../scales/train.js";
import { trainColor } from "../scales/train.js";
import type { CellValue } from "../table.js";

import { resolveOrdinalColorRange } from "./scale-color-ordinal-range.js";
import type { ColorResolution } from "./scale-color-types.js";
import type { Advisory, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

export function resolveOrdinalColorScale(input: {
  name: "color" | "fill";
  values: readonly CellValue[];
  config: ColorScaleSpec | undefined;
  prevState: ScaleState | null;
  legendTitle: string;
  warnings: PipelineWarning[];
  advisories: Advisory[];
  editionDefaults: EditionDefaults;
}): ColorResolution {
  const { name, values, config, prevState, legendTitle, warnings, advisories, editionDefaults } =
    input;

  const scheme = config?.scheme;
  const range = resolveOrdinalColorRange(config, editionDefaults);
  let scale: ColorScale;
  try {
    scale = trainColor(values, prevState, {
      ...(config?.domain !== undefined && { domain: config.domain }),
      ...(config?.domainMode !== undefined && { domainMode: config.domainMode }),
      ...(range !== undefined && { range }),
      ...(scheme !== undefined && { scheme }),
      ...(config?.reverse !== undefined && { reverse: config.reverse }),
      ...(config?.onExhaust !== undefined && { onExhaust: config.onExhaust }),
    });
  } catch (error) {
    if (error instanceof PaletteExhaustedError) {
      throw new PipelineError("palette-exhausted", `/scales/${name}`, error.message);
    }
    throw error;
  }
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
