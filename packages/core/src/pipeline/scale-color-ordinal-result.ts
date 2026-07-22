/**
 * Pack ordinal ColorScale into ColorResolution + palette-inferred advisory.
 */
import type { ColorScaleSpec } from "@ggsvelte/spec";
import { disambiguatedLabels } from "../legend.js";
import { normalizeColor } from "../scales/color.js";
import type { ColorScale } from "../scales/train.js";
import type { CellValue } from "../table.js";

import type { ColorResolution } from "./scale-color-types.js";
import type { Advisory, PipelineWarning } from "./types.js";

export function ordinalColorResolution(input: {
  name: "color" | "fill";
  values: readonly CellValue[];
  config: ColorScaleSpec | undefined;
  legendTitle: string;
  scale: ColorScale;
  warnings: PipelineWarning[];
  advisories: Advisory[];
}): ColorResolution {
  const { name, values, config, legendTitle, scale, warnings, advisories } = input;
  for (const w of scale.warnings) warnings.push({ code: w.code, message: w.message });
  if (config?.scheme === undefined && config?.range === undefined) {
    advisories.push({
      code: "palette-inferred",
      path: `scales.${name}`,
      chosen: "categorical 10-color palette (value-stable assignment)",
      howToOverride: `Set scales.${name}.scheme, scales.${name}.range, or scales.${name}.domain.`,
    });
  }
  const naValue = normalizeColor(config?.naValue ?? "#999999");
  const unknownValue = normalizeColor(config?.unknownValue ?? "#999999");
  const resolvedScale: ColorScale = {
    ...scale,
    naValue,
    unknownValue,
  };
  const domain = scale.domain.filter((value): value is CellValue => value !== undefined);
  const labels = disambiguatedLabels(domain);
  const entries = domain.map((value, index) =>
    Object.freeze({
      value,
      label: labels[index]!,
      color: resolvedScale.colorOf(value) ?? unknownValue,
    }),
  );
  return {
    resolved: { kind: "ordinal", scale: resolvedScale },
    legendInput: {
      kind: "discrete",
      scale: name,
      title: legendTitle,
      domain,
      firstSeen: values,
      colorOf: (value: unknown) => resolvedScale.colorOf(value),
    },
    guidePlan: Object.freeze({
      type: "discrete" as const,
      id: `guide:${name}`,
      aesthetic: name,
      scaleType: "ordinal" as const,
      title: legendTitle,
      domain: Object.freeze([...domain]),
      entries: Object.freeze(entries),
      naValue,
      unknownValue,
    }),
    state: scale.state,
  };
}
