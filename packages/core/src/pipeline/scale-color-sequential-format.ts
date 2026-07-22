/** Semantic color/fill guide label format resolution. */
import type { ColorScaleSpec, TemporalKind } from "@ggsvelte/spec";

import { compileTemporalLabelFormat, numberFormatter } from "../layout/format.js";
import { defaultTimeTickFormat } from "../layout/time.js";
import { defaultTickFormat, tickStep } from "../layout/ticks.js";
import type { SequentialColorScale } from "../scales/color.js";

import type { PipelineWarning } from "./types.js";

export interface ColorLegendFormatter {
  label(value: number): string;
  fullLabel(value: number): string;
}

function resolveColorLegendFormat(input: {
  domain: readonly [number, number];
  temporalKind: TemporalKind | null;
  config: Pick<ColorScaleSpec, "labels" | "timezone"> | undefined;
  name: string;
  warnings: PipelineWarning[];
}): ColorLegendFormatter {
  const { domain, temporalKind, config, name, warnings } = input;
  const labelFormat = config?.labels;
  if (temporalKind !== null) {
    const options = {
      kind: temporalKind,
      ...(config?.timezone !== undefined && { timezone: config.timezone }),
    };
    const fullLabel = compileTemporalLabelFormat(
      temporalKind === "date" ? "%Y-%m-%d" : "%Y-%m-%d %H:%M:%S %Z",
      options,
    );
    if (labelFormat !== undefined) {
      try {
        return {
          label: compileTemporalLabelFormat(labelFormat, options),
          fullLabel,
        };
      } catch {
        warnings.push({
          code: "invalid-label-format",
          message: `Unrecognized labels format "${labelFormat}" on scales.${name}; using the default.`,
        });
      }
    }
    const label =
      config?.timezone === undefined
        ? defaultTimeTickFormat
        : compileTemporalLabelFormat(
            temporalKind === "date" ? "%Y-%m-%d" : "%Y-%m-%d %H:%M",
            options,
          );
    return { label, fullLabel };
  }

  let label = defaultTickFormat(tickStep(domain[0], domain[1], 5));
  if (labelFormat !== undefined) {
    const formatter = numberFormatter(labelFormat);
    if (formatter.ok) {
      label = (value: number) => formatter.format(value);
    } else {
      warnings.push({
        code: "invalid-label-format",
        message: `Unrecognized labels format "${labelFormat}" on scales.${name}; using the default.`,
      });
    }
  }
  return { label, fullLabel: label };
}

export function resolveStyleLegendFormat(input: {
  domain: readonly [number, number];
  temporalKind: TemporalKind | null;
  config: { labels?: string; timezone?: string } | undefined;
  name: string;
  warnings: PipelineWarning[];
}): ColorLegendFormatter {
  return resolveColorLegendFormat(input);
}

export function resolveSequentialLegendFormat(
  scale: SequentialColorScale,
  config: ColorScaleSpec | undefined,
  name: "color" | "fill",
  warnings: PipelineWarning[],
): ColorLegendFormatter {
  return resolveColorLegendFormat({
    domain: scale.domain,
    temporalKind: scale.temporalKind ?? null,
    config,
    name,
    warnings,
  });
}

export function resolveBinnedLegendFormat(input: {
  domain: readonly [number, number];
  temporalKind: TemporalKind | null;
  config: ColorScaleSpec;
  name: "color" | "fill";
  warnings: PipelineWarning[];
}): ColorLegendFormatter {
  return resolveColorLegendFormat(input);
}
