/** Numeric style scales: size / linewidth / alpha (identity, sequential, binned, ordinal, manual). */
import { disambiguatedLabels } from "../domain-labels.js";
import type { StyleScale } from "../scales/style.js";
import { encodeKey, type ScaleState } from "../scales/state.js";
import type { CellValue } from "../table.js";

import { discreteStyleResolution, styleGuideEntry } from "./scale-style-discrete.js";
import type { NumericStyleAesthetic, StyleResolution } from "./scale-style-types.js";
import type { NumericStyleConfig } from "./scale-style-values.js";
import type { PipelineWarning } from "./types.js";
import {
  NUMERIC_DEFAULT_RANGE,
  numericFallback,
  numericMappedValue,
  numericOutputValid,
} from "./scale-style-numeric-helpers.js";
import { numericSequentialResolution } from "./scale-style-numeric-sequential.js";

function numericIdentityResolution(input: {
  aesthetic: NumericStyleAesthetic;
  values: readonly CellValue[];
  config: NumericStyleConfig | undefined;
  title: string;
  warnings: PipelineWarning[];
}): StyleResolution {
  const { aesthetic, values, config, title, warnings } = input;
  const unknownCount = values.filter(
    (value) =>
      value !== null &&
      !numericOutputValid(aesthetic, typeof value === "number" ? value : Number.NaN),
  ).length;
  if (unknownCount > 0) {
    warnings.push({
      code: "style-unknown-values",
      message: `${String(unknownCount)} ${aesthetic} value(s) use the unknown style.`,
    });
  }
  const fallback = numericFallback(aesthetic, config);
  const scale: StyleScale = Object.freeze({
    aesthetic,
    type: "identity" as const,
    domain: Object.freeze([]),
    naValue: fallback.naValue,
    unknownValue: fallback.unknownValue,
    valueOf(value: unknown): number {
      if (value === null || value === undefined) return fallback.naValue;
      const number = typeof value === "number" ? value : Number.NaN;
      return numericOutputValid(aesthetic, number) ? number : fallback.unknownValue;
    },
  });
  const forceGuide = config?.guide?.type === "legend" && config.guide.force === true;
  const domain = forceGuide
    ? [
        ...new Map(
          values
            .filter(
              (value): value is number =>
                typeof value === "number" && numericOutputValid(aesthetic, value),
            )
            .map((value) => [encodeKey(value), value]),
        ).values(),
      ]
    : [];
  const labels = disambiguatedLabels(domain);
  const entries = domain.map((value, index) =>
    styleGuideEntry(aesthetic, value, labels[index]!, scale.valueOf(value)),
  );
  return {
    aesthetic,
    resolved: { kind: "identity", scale },
    legendInput:
      domain.length === 0
        ? null
        : {
            kind: "discrete",
            scale: aesthetic,
            title,
            domain,
            firstSeen: values,
            keyOf: (value: unknown) => ({ [aesthetic]: scale.valueOf(value) }),
          },
    guidePlan:
      domain.length === 0
        ? null
        : Object.freeze({
            type: "discrete" as const,
            id: `guide:${aesthetic}`,
            aesthetic,
            scaleType: "identity" as const,
            title,
            domain: Object.freeze([...domain]),
            entries: Object.freeze(entries),
            naValue: fallback.naValue,
            unknownValue: fallback.unknownValue,
          }),
    state: null,
  };
}

export function resolveNumericStyleScale(input: {
  aesthetic: NumericStyleAesthetic;
  values: readonly CellValue[];
  catalog: readonly CellValue[];
  anyDiscrete: boolean;
  anyIndexable: boolean;
  nonInteractiveValues?: readonly CellValue[];
  config: NumericStyleConfig | undefined;
  prevState: ScaleState | null;
  title: string;
  warnings: PipelineWarning[];
}): StyleResolution {
  const {
    aesthetic,
    values,
    catalog,
    anyDiscrete,
    anyIndexable,
    nonInteractiveValues,
    config,
    prevState,
    title,
    warnings,
  } = input;
  const type = config?.type ?? (anyDiscrete ? "ordinal" : "sequential");
  if (type === "identity") {
    return numericIdentityResolution({
      aesthetic,
      values,
      config,
      title,
      warnings,
    });
  }
  if (type === "sequential" || type === "binned") {
    return numericSequentialResolution({
      aesthetic,
      kind: type,
      values,
      config,
      title,
      warnings,
    });
  }
  const defaultRange = NUMERIC_DEFAULT_RANGE[aesthetic];
  const range = [
    ...(config?.range ??
      Array.from({ length: 5 }, (_, index) =>
        numericMappedValue(aesthetic, index / 4, defaultRange, config?.sizeUnit),
      )),
  ];
  if (config?.reverse === true) range.reverse();
  const fallback = numericFallback(aesthetic, config);
  return discreteStyleResolution({
    aesthetic,
    kind: type,
    // Stat columns never reach the source catalog, so fall back to the observed
    // (post-stat) values when no catalog/explicit domain exists — matching color.
    values:
      type === "manual"
        ? (config?.domain ?? (catalog.length > 0 ? catalog : values))
        : catalog.length > 0
          ? catalog
          : values,
    observedValues: values,
    range,
    ...(config?.domain !== undefined && { domain: config.domain }),
    ...(config?.domainMode !== undefined && { domainMode: config.domainMode }),
    ...(config?.onExhaust !== undefined && { onExhaust: config.onExhaust }),
    naValue: fallback.naValue,
    unknownValue: fallback.unknownValue,
    indexable: anyIndexable,
    ...(nonInteractiveValues !== undefined && { nonInteractiveValues }),
    prevState,
    title,
    warnings,
  });
}
