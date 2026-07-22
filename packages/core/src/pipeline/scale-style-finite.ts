/** Finite style scales: shape / linetype (identity, binned, ordinal, manual). */
import { LINETYPE_NAMES, POINT_SHAPE_NAMES } from "@ggsvelte/spec";

import { numberFormatter } from "../layout/format.js";
import { disambiguatedLabels } from "../legend.js";
import type { Linetype, PointShape, StyleScale } from "../scales/style.js";
import { encodeKey, type ScaleState } from "../scales/state.js";
import { finiteExtent } from "../scales/train.js";
import type { CellValue } from "../table.js";

import { discreteStyleResolution, styleGuideEntry } from "./scale-style-discrete.js";
import type {
  FiniteStyleAesthetic,
  FiniteStyleConfig,
  StyleResolution,
} from "./scale-style-types.js";
import { PipelineError, type PipelineWarning } from "./types.js";

function finiteResolution(input: {
  aesthetic: FiniteStyleAesthetic;
  values: readonly CellValue[];
  catalog: readonly CellValue[];
  config: FiniteStyleConfig | undefined;
  indexable?: boolean;
  nonInteractiveValues?: readonly CellValue[];
  prevState: ScaleState | null;
  title: string;
  warnings: PipelineWarning[];
}): StyleResolution {
  const {
    aesthetic,
    values,
    catalog,
    config,
    indexable,
    nonInteractiveValues,
    prevState,
    title,
    warnings,
  } = input;
  const range: (PointShape | Linetype)[] = [
    ...(config?.range ?? (aesthetic === "shape" ? POINT_SHAPE_NAMES : LINETYPE_NAMES)),
  ];
  if (config?.reverse === true) range.reverse();
  const fallback = range[0]!;
  const naValue = config?.naValue ?? fallback;
  const unknownValue = config?.unknownValue ?? fallback;
  const type = config?.type ?? "ordinal";
  if (type === "identity") {
    const valid = new Set<string>(aesthetic === "shape" ? POINT_SHAPE_NAMES : LINETYPE_NAMES);
    const unknownCount = values.filter(
      (value) => value !== null && (typeof value !== "string" || !valid.has(value)),
    ).length;
    if (unknownCount > 0) {
      warnings.push({
        code: "style-unknown-values",
        message: `${String(unknownCount)} ${aesthetic} value(s) use the unknown style.`,
      });
    }
    const scale: StyleScale = Object.freeze({
      aesthetic,
      type,
      domain: Object.freeze([]),
      naValue,
      unknownValue,
      valueOf(value: unknown): PointShape | Linetype {
        return typeof value === "string" && valid.has(value as never)
          ? (value as PointShape | Linetype)
          : value === null || value === undefined
            ? naValue
            : unknownValue;
      },
    });
    const forceGuide = config?.guide?.type === "legend" && config.guide.force === true;
    const domain = forceGuide
      ? [
          ...new Map(
            values
              .filter((value) => typeof value === "string" && valid.has(value))
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
      resolved: { kind: type, scale },
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
              naValue,
              unknownValue,
            }),
      state: null,
    };
  }
  if (type === "binned") {
    const numeric = values.map((value) => (typeof value === "number" ? value : Number.NaN));
    const extent = finiteExtent([Float64Array.from(numeric)]);
    const configuredDomain = config?.domain;
    if (
      configuredDomain !== undefined &&
      (configuredDomain.length !== 2 ||
        configuredDomain.some((value) => typeof value !== "number" || !Number.isFinite(value)))
    ) {
      throw new PipelineError(
        "style-domain-invalid",
        `/scales/${aesthetic}/domain`,
        `The ${aesthetic} binned domain must contain exactly two finite numbers.`,
      );
    }
    // Prefer an explicit domain — or authored breaks — when data has no finite
    // samples (filtered-out frames, all-null mappings that should still emit
    // naValue bins). Authored breaks fully define the bins and domain below, so
    // they can train the scale without any extent.
    const authoredBreaks = config?.breaks;
    if (extent === null && configuredDomain === undefined && (authoredBreaks?.length ?? 0) < 2) {
      throw new PipelineError(
        "style-domain-empty",
        `/scales/${aesthetic}`,
        `No finite ${aesthetic} values can be binned.`,
      );
    }
    // low/high only feed the default-boundary fallback; when breaks are authored
    // they are unused, but must stay finite to avoid dereferencing a null extent.
    const low =
      configuredDomain === undefined
        ? extent === null
          ? (authoredBreaks![0] as number)
          : Math.min(...extent)
        : (configuredDomain[0] as number);
    const high =
      configuredDomain === undefined
        ? extent === null
          ? (authoredBreaks!.at(-1) as number)
          : Math.max(...extent)
        : (configuredDomain[1] as number);
    const boundaryCount = Math.min(range.length, 5) + 1;
    const boundaries =
      config?.breaks ??
      Array.from(
        { length: boundaryCount },
        (_, index) => low + ((high - low) * index) / (boundaryCount - 1),
      );
    if (
      boundaries.length < 2 ||
      boundaries.some(
        (value, index) => !Number.isFinite(value) || (index > 0 && value <= boundaries[index - 1]!),
      )
    ) {
      throw new PipelineError(
        "style-binned-breaks",
        `/scales/${aesthetic}/breaks`,
        `The ${aesthetic} boundaries must be finite and strictly increasing.`,
      );
    }
    if (
      config?.breaks !== undefined &&
      configuredDomain !== undefined &&
      (low !== boundaries[0] || high !== boundaries.at(-1))
    ) {
      throw new PipelineError(
        "style-domain-invalid",
        `/scales/${aesthetic}/domain`,
        `The ${aesthetic} binned domain must match its first and last boundaries.`,
      );
    }
    if (boundaries.length - 1 > range.length) {
      throw new PipelineError(
        "style-palette-exhausted",
        `/scales/${aesthetic}/breaks`,
        `${aesthetic} needs ${String(boundaries.length - 1)} outputs but only ${String(range.length)} are available.`,
      );
    }
    const valueOf = (value: unknown): PointShape | Linetype => {
      if (value === null || value === undefined) return naValue;
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < boundaries[0]! ||
        value > boundaries.at(-1)!
      )
        return unknownValue;
      let index = boundaries.findIndex((upper, i) => i > 0 && value < upper) - 1;
      if (index < 0) index = boundaries.length - 2;
      return range[index]!;
    };
    const scale: StyleScale = Object.freeze({
      aesthetic,
      type,
      domain: Object.freeze([boundaries[0]!, boundaries.at(-1)!]),
      naValue,
      unknownValue,
      valueOf,
    });
    let formatBoundary: (value: number) => string = String;
    if (config?.labels !== undefined) {
      const formatter = numberFormatter(config.labels);
      if (formatter.ok) formatBoundary = (value) => formatter.format(value);
      else {
        warnings.push({
          code: "invalid-label-format",
          message: `Unrecognized labels format "${config.labels}" on scales.${aesthetic}; using the default.`,
        });
      }
    }
    const entries = boundaries
      .slice(0, -1)
      .map((lower, index) =>
        styleGuideEntry(
          aesthetic,
          lower,
          `${formatBoundary(lower)}–${formatBoundary(boundaries[index + 1]!)}`,
          range[index]!,
        ),
      );
    return {
      aesthetic,
      resolved: { kind: type, scale },
      legendInput: {
        kind: "discrete" as const,
        scale: aesthetic,
        title,
        interactive: false,
        domain: boundaries.slice(0, -1),
        firstSeen: boundaries.slice(0, -1),
        labelOf: (value: unknown) => {
          if (typeof value !== "number") return String(value);
          const index = boundaries.indexOf(value);
          return index >= 0 && index < boundaries.length - 1
            ? `${formatBoundary(value)}–${formatBoundary(boundaries[index + 1]!)}`
            : String(value);
        },
        keyOf: (value: unknown) => ({ [aesthetic]: scale.valueOf(value) }),
      },
      guidePlan: Object.freeze({
        type: "discrete" as const,
        id: `guide:${aesthetic}`,
        aesthetic,
        scaleType: type,
        title,
        domain: Object.freeze(boundaries.slice(0, -1)),
        entries: Object.freeze(entries),
        naValue,
        unknownValue,
      }),
      state: null,
    };
  }
  return discreteStyleResolution({
    aesthetic,
    kind: type,
    // Fall back to observed values when the source catalog is empty (stat-only
    // finite mapping), mirroring the numeric-style path.
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
    naValue,
    unknownValue,
    ...(indexable !== undefined && { indexable }),
    ...(nonInteractiveValues !== undefined && { nonInteractiveValues }),
    prevState,
    title,
    warnings,
  });
}

export function resolveFiniteStyleScale(input: {
  aesthetic: FiniteStyleAesthetic;
  values: readonly CellValue[];
  catalog: readonly CellValue[];
  anyDiscrete: boolean;
  anyIndexable: boolean;
  nonInteractiveValues?: readonly CellValue[];
  config: FiniteStyleConfig | undefined;
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
  if (config?.type === undefined && !anyDiscrete) {
    throw new PipelineError(
      "unsupported-aesthetic-scale",
      `/scales/${aesthetic}`,
      `Continuous ${aesthetic} values require an explicit binned scale; named symbols cannot be interpolated.`,
    );
  }
  if (
    config?.type === "binned" &&
    values.some((value) => value !== null && value !== undefined && typeof value !== "number")
  ) {
    throw new PipelineError(
      "unsupported-aesthetic-scale",
      `/scales/${aesthetic}`,
      `Binned ${aesthetic} scales require numeric values; temporal (date/datetime) and other non-numeric values cannot be mapped to named symbols.`,
    );
  }
  return finiteResolution({
    aesthetic,
    values,
    catalog,
    config,
    indexable: anyIndexable,
    ...(nonInteractiveValues !== undefined && { nonInteractiveValues }),
    prevState,
    title,
    warnings,
  });
}
