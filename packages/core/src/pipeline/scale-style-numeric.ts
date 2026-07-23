/** Numeric style scales: size / linewidth / alpha (identity, sequential, binned, ordinal, manual). */
import { linearTicks } from "../layout/ticks.js";
import { disambiguatedLabels } from "../legend.js";
import type { StyleScale } from "../scales/style.js";
import { encodeKey, type ScaleState } from "../scales/state.js";
import { finiteExtent } from "../scales/train.js";
import type { CellValue } from "../table.js";

import { resolveStyleLegendFormat } from "./scale-color-sequential-format.js";
import { discreteStyleResolution, styleGuideEntry } from "./scale-style-discrete.js";
import type { NumericStyleAesthetic, StyleResolution } from "./scale-style-types.js";
import { resolveNumericStyleValueView, type NumericStyleConfig } from "./scale-style-values.js";
import { PipelineError, type PipelineWarning } from "./types.js";

const NUMERIC_DEFAULT_RANGE: Record<NumericStyleAesthetic, readonly [number, number]> = {
  size: [2, 9],
  linewidth: [0.5, 4],
  alpha: [0.2, 1],
};
const NUMERIC_DEFAULT_CONSTANT: Record<NumericStyleAesthetic, number> = {
  size: 2.5,
  linewidth: 1.5,
  alpha: 1,
};

function numericOutputValid(aesthetic: NumericStyleAesthetic, value: number): boolean {
  return Number.isFinite(value) && (aesthetic === "alpha" ? value >= 0 && value <= 1 : value > 0);
}

function numericFallback(
  aesthetic: NumericStyleAesthetic,
  config: NumericStyleConfig | undefined,
): { naValue: number; unknownValue: number } {
  const fallback = NUMERIC_DEFAULT_CONSTANT[aesthetic];
  return {
    naValue: config?.naValue ?? fallback,
    unknownValue: config?.unknownValue ?? fallback,
  };
}

function numericMappedValue(
  aesthetic: NumericStyleAesthetic,
  t: number,
  range: readonly [number, number],
): number {
  const bounded = Math.min(1, Math.max(0, t));
  if (aesthetic === "size") {
    return Math.sqrt(range[0] * range[0] + bounded * (range[1] * range[1] - range[0] * range[0]));
  }
  return range[0] + bounded * (range[1] - range[0]);
}

function numericSequentialResolution(input: {
  aesthetic: NumericStyleAesthetic;
  kind: "sequential" | "binned";
  values: readonly CellValue[];
  config: NumericStyleConfig | undefined;
  title: string;
  warnings: PipelineWarning[];
}): StyleResolution {
  const { aesthetic, kind, values, config, title, warnings } = input;
  const view = resolveNumericStyleValueView({ aesthetic, values, config, warnings });
  const configuredDomain = config?.domain;
  const mappedDomain =
    configuredDomain?.length === 2
      ? ([view.semanticOf(configuredDomain[0]), view.semanticOf(configuredDomain[1])] as const)
      : undefined;
  if (
    configuredDomain !== undefined &&
    (mappedDomain?.[0] === undefined || mappedDomain[1] === undefined)
  ) {
    throw new PipelineError(
      "style-domain-invalid",
      `/scales/${aesthetic}/domain`,
      `The ${aesthetic} domain must contain exactly two finite semantic values.`,
    );
  }
  const mappedBoundaries =
    kind === "binned" ? config?.breaks?.map((value) => view.semanticOf(value)) : undefined;
  if (
    kind === "binned" &&
    config?.breaks !== undefined &&
    (mappedBoundaries === undefined || mappedBoundaries.some((value) => value === undefined))
  ) {
    throw new PipelineError(
      "style-binned-breaks",
      `/scales/${aesthetic}/breaks`,
      `Every ${aesthetic} boundary must parse as a finite semantic value.`,
    );
  }
  const configuredBoundaries = mappedBoundaries as number[] | undefined;
  const boundaryDomain =
    configuredBoundaries !== undefined && configuredBoundaries.length >= 2
      ? ([configuredBoundaries[0]!, configuredBoundaries.at(-1)!] as [number, number])
      : null;
  if (
    boundaryDomain !== null &&
    mappedDomain?.[0] !== undefined &&
    mappedDomain[1] !== undefined &&
    (mappedDomain[0] !== boundaryDomain[0] || mappedDomain[1] !== boundaryDomain[1])
  ) {
    throw new PipelineError(
      "style-domain-invalid",
      `/scales/${aesthetic}/domain`,
      `The ${aesthetic} binned domain must match its first and last boundaries.`,
    );
  }
  const extent = finiteExtent([view.semantic]);
  const domain =
    boundaryDomain ??
    (mappedDomain?.[0] !== undefined && mappedDomain[1] !== undefined
      ? ([mappedDomain[0], mappedDomain[1]] as [number, number])
      : extent);
  if (domain === null) {
    throw new PipelineError(
      "style-domain-empty",
      `/scales/${aesthetic}`,
      `No finite values can train the ${aesthetic} scale.`,
    );
  }
  const low = Math.min(domain[0], domain[1]);
  const high = Math.max(domain[0], domain[1]);
  // Authored breaks on a sequential (non-binned) style scale are guide ticks,
  // not bin boundaries — mirror color sequential scales: parse them and require
  // each to lie inside the trained domain instead of running them through the
  // binned-boundary validation.
  const sequentialBreaks =
    kind !== "binned" && config?.breaks !== undefined
      ? config.breaks.map((value) => view.semanticOf(value))
      : undefined;
  if (
    sequentialBreaks !== undefined &&
    sequentialBreaks.some((value) => value === undefined || value < low || value > high)
  ) {
    throw new PipelineError(
      "style-domain-invalid",
      `/scales/${aesthetic}/breaks`,
      `Every ${aesthetic} break must parse and lie inside the ${aesthetic} domain.`,
    );
  }
  const fallback = numericFallback(aesthetic, config);
  const configuredRange = config?.range;
  if (configuredRange !== undefined && configuredRange.length < 2) {
    throw new PipelineError(
      "style-range-invalid",
      `/scales/${aesthetic}/range`,
      `The ${aesthetic} ${kind} scale needs at least two range values.`,
    );
  }
  const defaultRange = NUMERIC_DEFAULT_RANGE[aesthetic];
  const range: [number, number] =
    configuredRange !== undefined && configuredRange.length >= 2
      ? [configuredRange[0]!, configuredRange.at(-1)!]
      : [...defaultRange];
  if (config?.reverse === true) range.reverse();
  const boundaries =
    kind === "binned"
      ? (configuredBoundaries ??
        Array.from({ length: 6 }, (_, index) => low + ((high - low) * index) / 5))
      : [];
  if (
    kind === "binned" &&
    (boundaries.length < 2 ||
      boundaries.some((value, index) => index > 0 && value <= boundaries[index - 1]!))
  ) {
    throw new PipelineError(
      "style-binned-breaks",
      `/scales/${aesthetic}/breaks`,
      `The ${aesthetic} boundaries must be finite and strictly increasing.`,
    );
  }
  const semanticOutput = (semantic: number): number => {
    let bounded = semantic;
    if (semantic < low || semantic > high) {
      if (config?.oob !== "squish") return fallback.unknownValue;
      bounded = Math.min(high, Math.max(low, semantic));
    }
    let t: number;
    if (kind === "binned") {
      let bin = boundaries.findIndex((upper, index) => index > 0 && bounded < upper) - 1;
      if (bin < 0) bin = boundaries.length - 2;
      t = boundaries.length <= 2 ? 0.5 : bin / (boundaries.length - 2);
    } else {
      t = high === low ? 0.5 : (bounded - low) / (high - low);
    }
    return numericMappedValue(aesthetic, t, range);
  };
  let unknownCount = 0;
  for (const value of values) {
    if (value === null) continue;
    const semantic = view.semanticOf(value);
    if (
      semantic === undefined ||
      (config?.oob !== "squish" && (semantic < low || semantic > high))
    ) {
      unknownCount++;
    }
  }
  if (unknownCount > 0) {
    warnings.push({
      code: "style-unknown-values",
      message: `${String(unknownCount)} ${aesthetic} value(s) use the unknown style.`,
    });
  }
  const scale: StyleScale = Object.freeze({
    aesthetic,
    type: kind,
    domain: Object.freeze([...domain] as [number, number]),
    naValue: fallback.naValue,
    unknownValue: fallback.unknownValue,
    valueOf(value: unknown): number {
      if (value === null || value === undefined) return fallback.naValue;
      const semantic = view.semanticOf(value);
      return semantic === undefined ? fallback.unknownValue : semanticOutput(semantic);
    },
  });
  const ticks =
    kind === "binned"
      ? boundaries.slice(0, -1)
      : ((sequentialBreaks as number[] | undefined) ?? linearTicks(low, high, 5));
  const formatter = resolveStyleLegendFormat({
    domain,
    temporalKind: view.temporalKind,
    config,
    name: aesthetic,
    warnings,
  });
  const entries = ticks.map((value, index) =>
    styleGuideEntry(
      aesthetic,
      value,
      kind === "binned"
        ? `${formatter.label(value)}–${formatter.label(boundaries[index + 1]!)}`
        : formatter.label(value),
      semanticOutput(value),
    ),
  );
  return {
    aesthetic,
    resolved: { kind, scale },
    legendInput: {
      kind: "discrete" as const,
      scale: aesthetic,
      title,
      interactive: false,
      domain: ticks,
      firstSeen: ticks,
      labelOf: (value: unknown) => {
        if (typeof value !== "number") return String(value);
        const index = ticks.indexOf(value);
        return kind === "binned" && index >= 0
          ? `${formatter.label(value)}–${formatter.label(boundaries[index + 1]!)}`
          : formatter.label(value);
      },
      keyOf: (value: unknown) => ({ [aesthetic]: scale.valueOf(value) }),
    },
    guidePlan: Object.freeze({
      type: "discrete" as const,
      id: `guide:${aesthetic}`,
      aesthetic,
      scaleType: kind,
      title,
      domain: Object.freeze([...ticks]),
      entries: Object.freeze(entries),
      naValue: fallback.naValue,
      unknownValue: fallback.unknownValue,
    }),
    state: null,
  };
}

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
        numericMappedValue(aesthetic, index / 4, defaultRange),
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
