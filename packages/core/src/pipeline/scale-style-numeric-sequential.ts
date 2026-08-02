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

export function numericSequentialResolution(input: {
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
      const bin = styleBinIndex(boundaries, bounded);
      t = boundaries.length <= 2 ? 0.5 : bin / (boundaries.length - 2);
    } else {
      t = high === low ? 0.5 : (bounded - low) / (high - low);
    }
    return numericMappedValue(aesthetic, t, range, config?.sizeUnit);
  };
  // Index the batch semantic array (index-aligned when values is non-empty;
  // empty values skip this loop). Avoid semanticOf on the warn path so temporal
  // misses do not re-call parseColumn one row at a time.
  let unknownCount = 0;
  for (let index = 0; index < values.length; index++) {
    if (values[index] === null) continue;
    const semantic = view.semantic[index]!;
    if (
      !Number.isFinite(semantic) ||
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
