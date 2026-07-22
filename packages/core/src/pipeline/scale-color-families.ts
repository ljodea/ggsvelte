/** Binned, manual, and identity color/fill scale families. */
import type { ColorScaleSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import { disambiguatedLabels } from "../legend.js";
import { normalizeColor, rampColor, VIRIDIS_RAMP_10 } from "../scales/color.js";
import type {
  BinnedColorScale,
  IdentityColorScale,
  ManualColorScale,
} from "../scales/non-position-color.js";
import { encodeKey } from "../scales/state.js";
import { finiteExtent } from "../scales/train.js";
import { scaleTransform } from "../scales/transform.js";
import type { CellValue } from "../table.js";

import { resolveSequentialRange } from "./scale-color-sequential-domain.js";
import { resolveBinnedLegendFormat } from "./scale-color-sequential-format.js";
import type { ColorResolution } from "./scale-color-types.js";
import { resolveColorValueView } from "./scale-color-values.js";
import { PipelineError, type PipelineWarning } from "./types.js";

const DEFAULT_BIN_COUNT = 5;

function uniqueValues(values: readonly CellValue[]): CellValue[] {
  const seen = new Set<string>();
  const output: CellValue[] = [];
  for (const value of values) {
    if (value === null) continue;
    const key = encodeKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }
  return output;
}

function warnUnknownColors(
  name: "color" | "fill",
  count: number,
  warnings: PipelineWarning[],
): void {
  if (count === 0) return;
  warnings.push({
    code: "color-unknown-values",
    message: `${String(count)} ${name} value(s) use the unknown color.`,
  });
}

function fallbackColors(config: ColorScaleSpec | undefined): {
  naValue: string;
  unknownValue: string;
} {
  return {
    naValue: normalizeColor(config?.naValue ?? "#999999"),
    unknownValue: normalizeColor(config?.unknownValue ?? "#999999"),
  };
}

export function resolveManualColorScale(input: {
  name: "color" | "fill";
  values: readonly CellValue[];
  observedValues: readonly CellValue[];
  config: ColorScaleSpec;
  legendTitle: string;
  warnings: PipelineWarning[];
}): ColorResolution {
  const { name, values, observedValues, config, legendTitle, warnings } = input;
  const domain = (config.domain ?? uniqueValues(values)).filter(
    (value): value is CellValue => value !== null,
  );
  const colors = (config.range ?? []).map((color) => normalizeColor(color));
  if (domain.length !== colors.length) {
    throw new PipelineError(
      "color-manual-domain-range",
      `/scales/${name}`,
      `The manual ${name} scale needs one range color per domain value (${String(domain.length)} values, ${String(colors.length)} colors).`,
    );
  }
  const indexByKey = new Map(domain.map((value, index) => [encodeKey(value), index] as const));
  const { naValue, unknownValue } = fallbackColors(config);
  const scale: ManualColorScale = Object.freeze({
    type: "manual" as const,
    domain: Object.freeze([...domain]),
    colors: Object.freeze([...colors]),
    naValue,
    unknownValue,
    indexOf(value: unknown): number | undefined {
      try {
        return indexByKey.get(encodeKey(value));
      } catch {
        return undefined;
      }
    },
    colorOf(value: unknown): string | undefined {
      if (value === null || value === undefined) return naValue;
      const index = this.indexOf(value);
      return index === undefined ? unknownValue : colors[index];
    },
  });
  const labels = disambiguatedLabels(domain);
  const entries = domain.map((value, index) =>
    Object.freeze({ value, label: labels[index]!, color: colors[index]! }),
  );
  warnUnknownColors(
    name,
    observedValues.filter((value) => value !== null && scale.indexOf(value) === undefined).length,
    warnings,
  );
  const showGuide = entries.length > 0;
  return {
    resolved: { kind: "manual", scale },
    legendInput: showGuide
      ? {
          kind: "discrete",
          scale: name,
          title: legendTitle,
          domain,
          firstSeen: values,
          colorOf: (value: unknown) => scale.colorOf(value),
        }
      : null,
    guidePlan: showGuide
      ? Object.freeze({
          type: "discrete" as const,
          id: `guide:${name}`,
          aesthetic: name,
          scaleType: "manual" as const,
          title: legendTitle,
          domain: Object.freeze([...domain]),
          entries: Object.freeze(entries),
          naValue,
          unknownValue,
        })
      : null,
    state: null,
  };
}

export function resolveIdentityColorScale(input: {
  name: "color" | "fill";
  values: readonly CellValue[];
  config: ColorScaleSpec;
  warnings: PipelineWarning[];
}): ColorResolution {
  const { name, values, config, warnings } = input;
  const { naValue, unknownValue } = fallbackColors(config);
  const scale: IdentityColorScale = Object.freeze({
    type: "identity" as const,
    naValue,
    unknownValue,
    colorOf(value: unknown): string | undefined {
      if (value === null || value === undefined) return naValue;
      if (typeof value !== "string") return unknownValue;
      try {
        return normalizeColor(value);
      } catch {
        return unknownValue;
      }
    },
  });
  warnUnknownColors(
    name,
    values.filter(
      (value) =>
        value !== null &&
        (typeof value !== "string" || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)),
    ).length,
    warnings,
  );
  return {
    resolved: { kind: "identity", scale },
    legendInput: null,
    guidePlan: null,
    state: null,
  };
}

export function resolveBinnedColorScale(input: {
  name: "color" | "fill";
  values: readonly CellValue[];
  config: ColorScaleSpec;
  legendTitle: string;
  warnings: PipelineWarning[];
  editionDefaults: EditionDefaults;
}): ColorResolution {
  const { name, values, config, legendTitle, warnings, editionDefaults } = input;
  const view = resolveColorValueView({ name, values, config, warnings });
  const transformName = config.transform ?? "identity";
  const transform = scaleTransform(transformName);
  const valid = Float64Array.from(view.semantic, (value) =>
    transform.valid(value) ? value : Number.NaN,
  );
  const extent = finiteExtent([valid]);
  const configuredDomain = config.domain;
  const mappedDomain =
    configuredDomain?.length === 2
      ? ([view.semanticOf(configuredDomain[0]), view.semanticOf(configuredDomain[1])] as const)
      : undefined;
  if (
    configuredDomain !== undefined &&
    (mappedDomain?.[0] === undefined || mappedDomain[1] === undefined)
  ) {
    throw new PipelineError(
      "color-binned-domain",
      `/scales/${name}/domain`,
      `The ${name} binned domain must contain exactly two finite semantic values.`,
    );
  }
  let domain: [number, number] | null =
    mappedDomain?.[0] !== undefined && mappedDomain[1] !== undefined
      ? [mappedDomain[0], mappedDomain[1]]
      : extent;
  let breaks =
    config.breaks?.map((value) => view.semanticOf(value)).filter((value) => value !== undefined) ??
    [];
  if (config.breaks !== undefined && breaks.length !== config.breaks.length) {
    throw new PipelineError(
      "color-binned-breaks",
      `/scales/${name}/breaks`,
      `Every ${name} colorstep boundary must parse as a finite semantic value.`,
    );
  }
  if (breaks.length >= 2) {
    if (
      domain !== null &&
      configuredDomain !== undefined &&
      (domain[0] !== breaks[0] || domain[1] !== breaks.at(-1))
    ) {
      throw new PipelineError(
        "color-binned-domain",
        `/scales/${name}/domain`,
        `The ${name} binned domain must match the first and last explicit colorstep boundaries.`,
      );
    }
    domain = [breaks[0]!, breaks.at(-1)!];
  }
  if (domain === null) {
    throw new PipelineError(
      "color-binned-empty",
      `/scales/${name}`,
      `No ${name} values are valid for the ${transformName} binned scale.`,
    );
  }
  const t0 = transform.forward(domain[0]);
  const t1 = transform.forward(domain[1]);
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t0 === t1) {
    throw new PipelineError(
      "color-binned-domain",
      `/scales/${name}/domain`,
      `The ${name} binned domain must contain two distinct values valid for ${transformName}.`,
    );
  }
  if (breaks.length === 0) {
    breaks = Array.from({ length: DEFAULT_BIN_COUNT + 1 }, (_, index) =>
      transform.inverse(t0 + ((t1 - t0) * index) / DEFAULT_BIN_COUNT),
    );
  }
  const transformedBreaks = breaks.map((value) => transform.forward(value));
  if (
    transformedBreaks.some((value) => !Number.isFinite(value)) ||
    transformedBreaks.some((value, index) => index > 0 && value <= transformedBreaks[index - 1]!)
  ) {
    throw new PipelineError(
      "color-binned-breaks",
      `/scales/${name}/breaks`,
      `The ${name} colorstep boundaries must be distinct and strictly increasing in ${transformName} space.`,
    );
  }
  domain = [breaks[0]!, breaks.at(-1)!];
  const binCount = breaks.length - 1;
  const configuredRange = resolveSequentialRange(config, editionDefaults) ?? VIRIDIS_RAMP_10;
  const normalizedRange = configuredRange.map((color) => normalizeColor(color));
  let colors =
    normalizedRange.length === binCount
      ? [...normalizedRange]
      : Array.from({ length: binCount }, (_, index) =>
          rampColor(normalizedRange, (index + 0.5) / binCount),
        );
  if (config.reverse === true) colors = colors.toReversed();
  const { naValue, unknownValue } = fallbackColors(config);
  const sourceLower = domain[0];
  const sourceUpper = domain[1];
  const transformedOf = (semantic: number): number | undefined => {
    let bounded = semantic;
    if (bounded < sourceLower || bounded > sourceUpper) {
      if (config.oob !== "squish") return undefined;
      bounded = Math.min(sourceUpper, Math.max(sourceLower, bounded));
    }
    const transformed = transform.forward(bounded);
    return Number.isFinite(transformed) ? transformed : undefined;
  };
  const semanticColorOf = (semantic: number): string => {
    const transformed = transformedOf(semantic);
    if (transformed === undefined) return unknownValue;
    // Upper-bound search makes exact internal boundaries start the next bin;
    // the final boundary remains in the final closed interval.
    let low = 0;
    let high = transformedBreaks.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (transformed < transformedBreaks[middle]!) high = middle;
      else low = middle + 1;
    }
    const index = Math.min(binCount - 1, low - 1);
    return index < 0 ? unknownValue : colors[index]!;
  };
  const scale: BinnedColorScale = Object.freeze({
    type: "binned" as const,
    domain,
    transformedDomain: [transformedBreaks[0]!, transformedBreaks.at(-1)!] as [number, number],
    transform: transformName,
    reverse: config.reverse === true,
    breaks: Object.freeze([...breaks]),
    transformedBreaks: Object.freeze(transformedBreaks),
    colors: Object.freeze(colors),
    naValue,
    unknownValue,
    ...(view.temporalKind !== null && { temporalKind: view.temporalKind }),
    colorOf(value: unknown): string | undefined {
      if (value === null || value === undefined) return naValue;
      const semantic = view.semanticOf(value);
      return semantic === undefined ? unknownValue : semanticColorOf(semantic);
    },
  });
  warnUnknownColors(
    name,
    values.filter((value) => {
      if (value === null) return false;
      const semantic = view.semanticOf(value);
      if (semantic === undefined) return true;
      return transformedOf(semantic) === undefined;
    }).length,
    warnings,
  );
  const formatter = resolveBinnedLegendFormat({
    domain,
    temporalKind: view.temporalKind,
    config,
    name,
    warnings,
  });
  const steps = breaks.slice(0, -1).map((lower, index) => {
    const upper = breaks[index + 1]!;
    return Object.freeze({
      lower,
      upper,
      lowerInclusive: true as const,
      upperInclusive: index === binCount - 1,
      label: `${formatter.label(lower)}–${formatter.label(upper)}`,
      color: colors[index]!,
    });
  });
  return {
    resolved: { kind: "binned", scale },
    legendInput: {
      kind: "steps",
      scale: name,
      title: legendTitle,
      entries: steps.map(({ label, color }) => ({ label, color })),
    },
    guidePlan: Object.freeze({
      type: "colorsteps" as const,
      id: `guide:${name}`,
      aesthetic: name,
      title: legendTitle,
      domain: Object.freeze([...domain] as [number, number]),
      transformedDomain: Object.freeze([...scale.transformedDomain] as [number, number]),
      transform: transformName,
      temporalKind: view.temporalKind,
      direction: config.reverse === true ? ("descending" as const) : ("ascending" as const),
      steps: Object.freeze(steps),
      naValue,
      unknownValue,
    }),
    state: null,
  };
}
