/** Training and semantic guide planning for mapped size/linewidth/alpha/shape/linetype. */
import {
  LINETYPE_NAMES,
  POINT_SHAPE_NAMES,
  type PortableSpec,
  type StyleAesthetic,
} from "@ggsvelte/spec";

import { numberFormatter } from "../layout/format.js";
import { linearTicks } from "../layout/ticks.js";
import { disambiguatedLabels } from "../legend.js";
import {
  type Linetype,
  type PointShape,
  type StyleOutput,
  type StyleScale,
} from "../scales/style.js";
import {
  encodeKey,
  PaletteExhaustedError,
  trainDiscrete,
  type ScaleState,
} from "../scales/state.js";
import { finiteExtent } from "../scales/train.js";
import type { CellValue, ColumnTable } from "../table.js";

import { styleFrameValues } from "./geometry-style.js";
import { resolveStyleLegendFormat } from "./scale-color-sequential-format.js";
import type { StyleResolution } from "./scale-style-types.js";
import { resolveNumericStyleValueView, type NumericStyleConfig } from "./scale-style-values.js";
import {
  PipelineError,
  type LayerBinding,
  type LayerFrame,
  type PipelineWarning,
} from "./types.js";

type NumericStyleAesthetic = Extract<StyleAesthetic, "size" | "linewidth" | "alpha">;
type FiniteStyleAesthetic = Extract<StyleAesthetic, "shape" | "linetype">;

type FiniteStyleConfig = NonNullable<PortableSpec["scales"]>[FiniteStyleAesthetic];

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

function bindingOf(binding: LayerBinding, aesthetic: StyleAesthetic) {
  return binding[aesthetic];
}

function collectValues(input: {
  aesthetic: StyleAesthetic;
  frames: readonly LayerFrame[];
  bindings: readonly LayerBinding[];
  table: ColumnTable;
  sourceTable: ColumnTable;
}): { values: CellValue[]; catalog: CellValue[]; anyField: boolean; anyDiscrete: boolean } {
  const { aesthetic, frames, bindings, table, sourceTable } = input;
  const values: CellValue[] = [];
  let anyField = false;
  let anyDiscrete = false;
  for (const frame of frames) {
    const binding = bindingOf(frame.binding, aesthetic);
    const mapped = styleFrameValues(frame, aesthetic);
    if ((binding.field !== null || binding.statColumn !== null) && mapped !== null) {
      anyField = true;
      if (
        binding.field !== null &&
        table.has(binding.field) &&
        table.discreteness(binding.field) === "discrete"
      ) {
        anyDiscrete = true;
      }
      values.push(...mapped);
    }
    if (binding.scaledConstant !== null) {
      anyField = true;
      anyDiscrete = true;
      values.push(binding.scaledConstant);
    }
    if (binding.statColumn !== null) anyField = true;
  }
  const catalog: CellValue[] = [];
  const seen = new Set<string>();
  const add = (value: CellValue) => {
    const key = encodeKey(value);
    if (seen.has(key)) return;
    seen.add(key);
    catalog.push(value);
  };
  for (const binding of bindings) {
    const mapped = bindingOf(binding, aesthetic);
    if (mapped.field !== null && sourceTable.has(mapped.field)) {
      anyField = true;
      if (sourceTable.discreteness(mapped.field) === "discrete") anyDiscrete = true;
      for (const value of sourceTable.column(mapped.field)) add(value);
    }
    if (mapped.scaledConstant !== null) add(mapped.scaledConstant);
  }
  return { values, catalog, anyField, anyDiscrete };
}

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

function styleGuideEntry(
  aesthetic: StyleAesthetic,
  value: CellValue,
  label: string,
  output: StyleOutput,
) {
  return Object.freeze({ value, label, [aesthetic]: output });
}

function discreteResolution(input: {
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
  const ticks = kind === "binned" ? boundaries.slice(0, -1) : linearTicks(low, high, 5);
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
  warnings: PipelineWarning[];
}): StyleResolution {
  const { aesthetic, values, config, warnings } = input;
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
  return {
    aesthetic,
    resolved: { kind: "identity", scale },
    legendInput: null,
    guidePlan: null,
    state: null,
  };
}

function finiteResolution(input: {
  aesthetic: FiniteStyleAesthetic;
  values: readonly CellValue[];
  catalog: readonly CellValue[];
  config: FiniteStyleConfig | undefined;
  prevState: ScaleState | null;
  title: string;
  warnings: PipelineWarning[];
}): StyleResolution {
  const { aesthetic, values, catalog, config, prevState, title, warnings } = input;
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
    return {
      aesthetic,
      resolved: { kind: type, scale },
      legendInput: null,
      guidePlan: null,
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
    // Prefer an explicit domain when data has no finite samples (filtered-out
    // frames, all-null mappings that should still emit naValue bins).
    if (extent === null && configuredDomain === undefined) {
      throw new PipelineError(
        "style-domain-empty",
        `/scales/${aesthetic}`,
        `No finite ${aesthetic} values can be binned.`,
      );
    }
    const low =
      configuredDomain === undefined ? Math.min(...extent!) : (configuredDomain[0] as number);
    const high =
      configuredDomain === undefined ? Math.max(...extent!) : (configuredDomain[1] as number);
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
  return discreteResolution({
    aesthetic,
    kind: type,
    values: type === "manual" ? (config?.domain ?? catalog) : catalog,
    observedValues: values,
    range,
    ...(config?.domain !== undefined && { domain: config.domain }),
    ...(config?.domainMode !== undefined && { domainMode: config.domainMode }),
    ...(config?.onExhaust !== undefined && { onExhaust: config.onExhaust }),
    naValue,
    unknownValue,
    prevState,
    title,
    warnings,
  });
}

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
  const collected = collectValues(input);
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
    if (config?.type === undefined && !collected.anyDiscrete) {
      throw new PipelineError(
        "unsupported-aesthetic-scale",
        `/scales/${aesthetic}`,
        `Continuous ${aesthetic} values require an explicit binned scale; named symbols cannot be interpolated.`,
      );
    }
    if (
      config?.type === "binned" &&
      collected.values.some(
        (value) => value !== null && value !== undefined && typeof value !== "number",
      )
    ) {
      throw new PipelineError(
        "unsupported-aesthetic-scale",
        `/scales/${aesthetic}`,
        `Binned ${aesthetic} scales require numeric values; temporal (date/datetime) and other non-numeric values cannot be mapped to named symbols.`,
      );
    }
    return finiteResolution({
      aesthetic,
      values: collected.values,
      catalog: collected.catalog,
      config: config as FiniteStyleConfig | undefined,
      prevState,
      title,
      warnings,
    });
  }
  const numericConfig = config as NumericStyleConfig | undefined;
  const type = numericConfig?.type ?? (collected.anyDiscrete ? "ordinal" : "sequential");
  if (type === "identity") {
    return numericIdentityResolution({
      aesthetic,
      values: collected.values,
      config: numericConfig,
      warnings,
    });
  }
  if (type === "sequential" || type === "binned") {
    return numericSequentialResolution({
      aesthetic,
      kind: type,
      values: collected.values,
      config: numericConfig,
      title,
      warnings,
    });
  }
  const defaultRange = NUMERIC_DEFAULT_RANGE[aesthetic];
  const range = [
    ...(numericConfig?.range ??
      Array.from({ length: 5 }, (_, index) =>
        numericMappedValue(aesthetic, index / 4, defaultRange),
      )),
  ];
  if (numericConfig?.reverse === true) range.reverse();
  const fallback = numericFallback(aesthetic, numericConfig);
  return discreteResolution({
    aesthetic,
    kind: type,
    values: type === "manual" ? (numericConfig?.domain ?? collected.catalog) : collected.catalog,
    observedValues: collected.values,
    range,
    ...(numericConfig?.domain !== undefined && { domain: numericConfig.domain }),
    ...(numericConfig?.domainMode !== undefined && { domainMode: numericConfig.domainMode }),
    ...(numericConfig?.onExhaust !== undefined && { onExhaust: numericConfig.onExhaust }),
    naValue: fallback.naValue,
    unknownValue: fallback.unknownValue,
    prevState,
    title,
    warnings,
  });
}
