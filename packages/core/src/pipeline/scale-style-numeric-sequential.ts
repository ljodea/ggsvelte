/**
 * Sequential and binned resolution for numeric style scales (size / linewidth / alpha).
 */
import { linearTicks } from "../layout/ticks.js";
import type { StyleScale } from "../scales/style.js";
import { finiteExtent } from "../scales/train.js";
import type { CellValue } from "../table.js";

import { minAdjacentWidth, resolveStyleLegendFormat } from "./scale-color-sequential-format.js";
import { styleGuideEntry } from "./scale-style-discrete.js";
import type { NumericStyleAesthetic, StyleResolution } from "./scale-style-types.js";
import { resolveNumericStyleValueView, type NumericStyleConfig } from "./scale-style-values.js";
import { styleBinIndex } from "./style-bin-index.js";
import { PipelineError, type PipelineWarning } from "./types.js";
import {
  NUMERIC_DEFAULT_RANGE,
  numericFallback,
  numericMappedValue,
} from "./scale-style-numeric-helpers.js";

type NumericSequentialInput = {
  aesthetic: NumericStyleAesthetic;
  kind: "sequential" | "binned";
  values: readonly CellValue[];
  config: NumericStyleConfig | undefined;
  title: string;
  warnings: PipelineWarning[];
};

type NumericDomain = {
  domain: [number, number];
  low: number;
  high: number;
  boundaries: number[];
  sequentialBreaks: number[] | undefined;
};

function resolveNumericConfiguredDomain(
  input: Pick<NumericSequentialInput, "aesthetic" | "kind" | "config"> & {
    view: ReturnType<typeof resolveNumericStyleValueView>;
  },
): {
  mappedDomain: readonly [number | undefined, number | undefined] | undefined;
  configuredBoundaries: number[] | undefined;
  boundaryDomain: [number, number] | null;
} {
  const { aesthetic, kind, config, view } = input;
  const mappedDomain = mapNumericDomain(config?.domain, view);
  if (
    config?.domain !== undefined &&
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
  if (kind === "binned" && config?.breaks !== undefined && hasInvalidBoundaries(mappedBoundaries)) {
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
  validateNumericBoundaryDomain(aesthetic, mappedDomain, boundaryDomain);
  return { mappedDomain, configuredBoundaries, boundaryDomain };
}

function validateNumericBoundaryDomain(
  aesthetic: NumericStyleAesthetic,
  mappedDomain: readonly [number | undefined, number | undefined] | undefined,
  boundaryDomain: [number, number] | null,
): void {
  if (
    boundaryDomain === null ||
    mappedDomain?.[0] === undefined ||
    mappedDomain[1] === undefined ||
    (mappedDomain[0] === boundaryDomain[0] && mappedDomain[1] === boundaryDomain[1])
  ) {
    return;
  }
  throw new PipelineError(
    "style-domain-invalid",
    `/scales/${aesthetic}/domain`,
    `The ${aesthetic} binned domain must match its first and last boundaries.`,
  );
}

function mapNumericDomain(
  domain: NumericStyleConfig["domain"],
  view: ReturnType<typeof resolveNumericStyleValueView>,
): readonly [number | undefined, number | undefined] | undefined {
  return domain?.length === 2
    ? ([view.semanticOf(domain[0]), view.semanticOf(domain[1])] as const)
    : undefined;
}

function hasInvalidBoundaries(values: readonly (number | undefined)[] | undefined): boolean {
  return values === undefined || values.some((value) => value === undefined);
}

function resolveNumericDomain(
  input: Pick<NumericSequentialInput, "aesthetic" | "kind" | "config"> & {
    view: ReturnType<typeof resolveNumericStyleValueView>;
  },
): NumericDomain {
  const { aesthetic, kind, config, view } = input;
  const { mappedDomain, configuredBoundaries, boundaryDomain } =
    resolveNumericConfiguredDomain(input);
  const extent = finiteExtent([view.semantic]);
  let domain =
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
  // scale_size_area: force the domain to include zero so zero→zero area (#830).
  if (aesthetic === "size" && config?.sizeUnit === "area_zero") {
    const lo = Math.min(domain[0], domain[1], 0);
    const hi = Math.max(domain[0], domain[1], 0);
    domain = [lo, hi];
  }
  const low = Math.min(domain[0], domain[1]);
  const high = Math.max(domain[0], domain[1]);
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
  return {
    domain,
    low,
    high,
    boundaries,
    sequentialBreaks: sequentialBreaks as number[] | undefined,
  };
}

function resolveNumericRange(
  input: Pick<NumericSequentialInput, "aesthetic" | "kind" | "config"> & {
    low: number;
    high: number;
    boundaries: number[];
  },
): { fallback: ReturnType<typeof numericFallback>; range: [number, number] } {
  const { aesthetic, kind, config } = input;
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
  return { fallback, range };
}

function numericSemanticOutput(
  input: Pick<NumericSequentialInput, "aesthetic" | "kind" | "config"> & {
    low: number;
    high: number;
    boundaries: number[];
    fallback: ReturnType<typeof numericFallback>;
    range: [number, number];
  },
): (semantic: number) => number {
  const { aesthetic, kind, config, low, high, boundaries, fallback, range } = input;
  return (semantic: number): number => {
    let bounded = semantic;
    if (semantic < low || semantic > high) {
      if (config?.oob !== "squish") return fallback.unknownValue;
      bounded = Math.min(high, Math.max(low, semantic));
    }
    const t =
      kind === "binned"
        ? boundaries.length <= 2
          ? 0.5
          : styleBinIndex(boundaries, bounded) / (boundaries.length - 2)
        : high === low
          ? 0.5
          : (bounded - low) / (high - low);
    return numericMappedValue(aesthetic, t, range, config?.sizeUnit);
  };
}

function countNumericUnknowns(
  values: readonly CellValue[],
  semanticValues: Float64Array,
  low: number,
  high: number,
  oob: NumericStyleConfig["oob"],
): number {
  // Index the batch semantic array (index-aligned when values is non-empty;
  // empty values skip this loop). Avoid semanticOf on the warn path so temporal
  // misses do not re-call parseColumn one row at a time.
  let unknownCount = 0;
  for (let index = 0; index < values.length; index++) {
    if (values[index] === null) continue;
    const semantic = semanticValues[index]!;
    if (!Number.isFinite(semantic) || (oob !== "squish" && (semantic < low || semantic > high))) {
      unknownCount++;
    }
  }
  return unknownCount;
}

export function numericSequentialResolution(input: NumericSequentialInput): StyleResolution {
  const { aesthetic, kind, values, config, title, warnings } = input;
  const view = resolveNumericStyleValueView({ aesthetic, values, config, warnings });
  const domainInfo = resolveNumericDomain({ aesthetic, kind, config, view });
  const rangeInfo = resolveNumericRange({ aesthetic, kind, config, ...domainInfo });
  const semanticOutput = numericSemanticOutput({
    aesthetic,
    kind,
    config,
    ...domainInfo,
    ...rangeInfo,
  });
  const unknownCount = countNumericUnknowns(
    values,
    view.semantic,
    domainInfo.low,
    domainInfo.high,
    config?.oob,
  );
  if (unknownCount > 0) {
    warnings.push({
      code: "style-unknown-values",
      message: `${String(unknownCount)} ${aesthetic} value(s) use the unknown style.`,
    });
  }
  const { fallback } = rangeInfo;
  const { domain, low, high, boundaries, sequentialBreaks } = domainInfo;
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
    kind === "binned" ? boundaries.slice(0, -1) : (sequentialBreaks ?? linearTicks(low, high, 5));
  const formatStep = kind === "binned" ? minAdjacentWidth(boundaries) : undefined;
  const formatter = resolveStyleLegendFormat({
    domain,
    temporalKind: view.temporalKind,
    config,
    name: aesthetic,
    warnings,
    ...(formatStep !== undefined && { formatStep }),
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
