/** Shared ordinal/manual discrete training and guide assembly for style aesthetics. */
import type { StyleAesthetic } from "@ggsvelte/spec";

import { disambiguatedLabels } from "../legend.js";
import type { StyleOutput, StyleScale } from "../scales/style.js";
import { PaletteExhaustedError, trainDiscrete, type ScaleState } from "../scales/state.js";
import type { CellValue } from "../table.js";

import type { StyleResolution } from "./scale-style-types.js";
import { PipelineError, type PipelineWarning } from "./types.js";

export function styleGuideEntry(
  aesthetic: StyleAesthetic,
  value: CellValue,
  label: string,
  output: StyleOutput,
) {
  return Object.freeze({ value, label, [aesthetic]: output });
}

export function discreteStyleResolution(input: {
  aesthetic: StyleAesthetic;
  kind: "ordinal" | "manual";
  values: readonly CellValue[];
  observedValues: readonly CellValue[];
  range: readonly StyleOutput[];
  domain?: readonly CellValue[];
  domainMode?: "grow" | "data";
  onExhaust?: "cycle" | "error";
  naValue: StyleOutput;
  unknownValue: StyleOutput;
  indexable?: boolean;
  prevState: ScaleState | null;
  title: string;
  warnings: PipelineWarning[];
}): StyleResolution {
  const {
    aesthetic,
    kind,
    values,
    observedValues,
    range,
    domain,
    domainMode,
    onExhaust,
    naValue,
    unknownValue,
    indexable,
    prevState,
    title,
    warnings,
  } = input;
  if (kind === "manual" && domain !== undefined && domain.length !== range.length) {
    throw new PipelineError(
      "style-manual-domain-range",
      `/scales/${aesthetic}`,
      `The manual ${aesthetic} scale needs one range value per domain value (${String(domain.length)} values, ${String(range.length)} outputs).`,
    );
  }
  let trained: ReturnType<typeof trainDiscrete>;
  try {
    trained = trainDiscrete(
      values.filter((value) => value !== null),
      {
        type: `${aesthetic}-${kind}`,
        range,
        ...(domain !== undefined && { domain }),
        ...(domainMode !== undefined && { domainMode }),
        onExhaust: onExhaust ?? "error",
      },
      prevState,
    );
  } catch (error) {
    if (error instanceof PaletteExhaustedError) {
      throw new PipelineError(
        "style-palette-exhausted",
        `/scales/${aesthetic}/range`,
        `${error.message} ${aesthetic} has ${String(range.length)} distinguishable outputs.`,
      );
    }
    throw error;
  }
  for (const warning of trained.warnings) {
    warnings.push({ code: `style-${warning.code}`, message: `${aesthetic}: ${warning.message}` });
  }
  const resolvedDomain = trained.domain as CellValue[];
  const scale: StyleScale = Object.freeze({
    aesthetic,
    type: kind,
    domain: Object.freeze([...resolvedDomain]),
    naValue,
    unknownValue,
    indexOf: (value: unknown) => trained.indexOf(value),
    valueOf(value: unknown): StyleOutput {
      if (value === null || value === undefined) return naValue;
      return (trained.rangeValueOf(value) as StyleOutput | undefined) ?? unknownValue;
    },
  });
  const labels = disambiguatedLabels(resolvedDomain);
  const entries = resolvedDomain.map((value, index) =>
    styleGuideEntry(aesthetic, value, labels[index]!, scale.valueOf(value)),
  );
  const unknownCount = observedValues.filter(
    (value) => value !== null && trained.indexOf(value) === undefined,
  ).length;
  if (unknownCount > 0) {
    warnings.push({
      code: "style-unknown-values",
      message: `${String(unknownCount)} ${aesthetic} value(s) use the unknown style.`,
    });
  }
  return {
    aesthetic,
    resolved: { kind, scale },
    legendInput:
      entries.length === 0
        ? null
        : {
            kind: "discrete" as const,
            scale: aesthetic,
            title,
            // Stat-only mappings have no field/constant to index, so the key
            // index resolves no rows — render swatches but disable hover/click.
            ...(indexable === false && { interactive: false }),
            domain: resolvedDomain,
            firstSeen: observedValues,
            keyOf: (value: unknown) => ({ [aesthetic]: scale.valueOf(value) }),
          },
    guidePlan:
      entries.length === 0
        ? null
        : Object.freeze({
            type: "discrete" as const,
            id: `guide:${aesthetic}`,
            aesthetic,
            scaleType: kind,
            title,
            domain: Object.freeze([...resolvedDomain]),
            entries: Object.freeze(entries),
            naValue,
            unknownValue,
          }),
    state: trained.state,
  };
}
