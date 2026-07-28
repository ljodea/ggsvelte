/**
 * Layout/scene assembly helpers used by runPipeline: domain projection,
 * tick formatters, margin max, and warning/advisory dedupe.
 */
import type { PositionScaleSpec, TemporalScaleKind } from "@ggsvelte/spec";

import type {
  BandLayoutDomainContext,
  Domain,
  LayoutResult,
  Margins,
  TemporalLayoutDomainContext,
  TickFormatter,
} from "../layout/layout.js";
import { compileTemporalLabelFormat, formatTime, numberFormatter } from "../layout/format.js";
import { defaultTickFormat, tickStep } from "../layout/ticks.js";
import { defaultLogTickFormat } from "../layout/ticks.js";
import { defaultTimeTickFormat } from "../layout/time.js";
import { encodeKey } from "../scales/state.js";
import type { PositionScale } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { cellToNumber } from "../table.js";
import type { SceneTick } from "../scene.js";

import type { Advisory, AxisValueFormatter, PipelineWarning } from "./types.js";

export const TITLE_BAND = 22;
export const SUBTITLE_BAND = 16;
export const CAPTION_BAND = 14;
export const AXIS_TITLE_BAND = 18;
export const LEGEND_GAP = 12;
export const LEGEND_EDGE_PAD = 2;

export function layoutDomain(
  scale: PositionScale,
  breaks: readonly (number | string)[] | undefined,
  temporal?: TemporalLayoutDomainContext,
  band?: BandLayoutDomainContext,
): Domain {
  if (scale.type === "band") {
    return {
      type: "band",
      categories: [...scale.domain],
      rawCategories: scale.rawDomain,
      ...(breaks !== undefined && {
        // First-occurrence dedupe by encodeKey (O(K)), not nested findIndex (O(K²)).
        breaks: (() => {
          const seen = new Set<string>();
          const unique: (string | number)[] = [];
          for (const value of breaks) {
            const key = encodeKey(value);
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(value);
          }
          return unique;
        })(),
      }),
      ...(band !== undefined && { band }),
    };
  }
  const numericBreaks =
    breaks === undefined
      ? undefined
      : breaks.map((b) => cellToNumber(b as CellValue)).filter((v) => Number.isFinite(v));
  if (scale.type === "time") {
    return {
      type: "time",
      min: scale.domain[0],
      max: scale.domain[1],
      ...(numericBreaks !== undefined && { breaks: numericBreaks }),
      ...(temporal !== undefined && { temporal }),
    };
  }
  return {
    type: "linear",
    transform: scale.transform,
    min: scale.domain[0],
    max: scale.domain[1],
    ...(numericBreaks !== undefined && { breaks: numericBreaks }),
  };
}

export function makeAxisFormatter(
  axis: "x" | "y",
  scale: PositionScale,
  config: PositionScaleSpec | undefined,
  warnings: PipelineWarning[],
  resolvedTemporalKind?: TemporalScaleKind | null,
): TickFormatter | undefined {
  if (config?.breaks !== undefined && config.dateBreaks !== undefined) {
    warnings.push({
      code: "unused-scale-option",
      message: `scales.${axis}.breaks takes precedence; dateBreaks is ignored.`,
    });
  }
  if (config?.labels !== undefined && config.dateLabels !== undefined) {
    warnings.push({
      code: "unused-scale-option",
      message: `scales.${axis}.dateLabels takes precedence; labels is ignored.`,
    });
  }
  if (config?.minorBreaks !== undefined && config.dateMinorBreaks !== undefined) {
    warnings.push({
      code: "unused-scale-option",
      message: `scales.${axis}.dateMinorBreaks takes precedence; minorBreaks is ignored.`,
    });
  }
  const labels = config?.dateLabels ?? config?.labels;
  if (labels === undefined) {
    if (scale.type !== "time") return undefined;
    const kind = resolvedTemporalKind ?? config?.temporalKind ?? "datetime";
    const defaultPattern =
      kind === "date"
        ? "%Y-%m-%d"
        : kind === "time"
          ? "%H:%M:%S"
          : // The crosshair and tooltip header read through here, so this is
            // where a month-day axis says "Apr 1" rather than a stamped date.
            kind === "monthDay"
            ? "%b %e"
            : "%Y-%m-%d %H:%M:%S %Z";
    const format = compileTemporalLabelFormat(defaultPattern, {
      kind,
      locale: config?.locale ?? "en-US",
      timezone: config?.timezone ?? "UTC",
    });
    return (value) => format(value as number);
  }
  if (scale.type === "band") {
    warnings.push({
      code: "invalid-label-format",
      message: `scales.${axis}.labels format strings apply to continuous scales; the band ${axis} scale ignores it.`,
    });
    return undefined;
  }
  if (scale.type === "time") {
    if (config?.dateLabels !== undefined) {
      const format = compileTemporalLabelFormat(config.dateLabels, {
        kind: resolvedTemporalKind ?? config.temporalKind ?? "datetime",
        locale: config.locale ?? "en-US",
        timezone: config.timezone ?? "UTC",
      });
      return (value) => format(value as number);
    }
    return (value) => formatTime(value as number, labels);
  }
  const f = numberFormatter(labels);
  if (!f.ok) {
    warnings.push({
      code: "invalid-label-format",
      message: `Unrecognized labels format "${labels}" on scales.${axis}; using the default.`,
    });
    return undefined;
  }
  return (value) => f.format(value as number);
}

export function makeAxisValueFormatter(
  scale: PositionScale,
  custom: TickFormatter | undefined,
  valueToNumber?: (value: CellValue) => number,
): AxisValueFormatter {
  if (scale.type === "band") return (value) => (value === null ? "–" : String(value));
  const fallback =
    scale.type === "time"
      ? defaultTimeTickFormat
      : scale.transform === "log10"
        ? defaultLogTickFormat
        : defaultTickFormat(tickStep(scale.domain[0], scale.domain[1], 5));
  return (value) => {
    if (value === null) return "–";
    const numeric = valueToNumber?.(value) ?? cellToNumber(value);
    return custom === undefined ? fallback(numeric) : custom(numeric, NaN);
  };
}

export function axisTicks(
  scale: PositionScale,
  ticks: LayoutResult["x"]["ticks"],
  extent: number,
  fromEnd: boolean,
): SceneTick[] {
  const out: SceneTick[] = [];
  for (let index = 0; index < ticks.length; index++) {
    const tick = ticks[index]!;
    // Band ticks carry their typed domain position because explicit breaks
    // may filter or reorder presentation ticks independently of the domain.
    const semanticValue =
      scale.type === "band"
        ? tick.domainIndex === undefined
          ? index < scale.rawDomain.length
            ? scale.rawDomain[index]
            : tick.value
          : scale.rawDomain[tick.domainIndex]
        : tick.value;
    const t =
      scale.type === "band"
        ? scale.normalize(semanticValue)
        : scale.normalize(tick.value as number);
    if (t === undefined || Number.isNaN(t)) continue;
    const pos = fromEnd ? extent - t * extent : t * extent;
    out.push({
      pos,
      value: semanticValue as CellValue,
      label: tick.labeled ? tick.label : "",
      fullLabel: tick.fullLabel ?? tick.label,
      kind: tick.kind ?? "major",
      ...(tick.lines !== undefined && { lines: tick.lines }),
      ...(tick.angle !== undefined && { angle: tick.angle }),
    });
  }
  return out;
}

export function dedupeWarnings(list: PipelineWarning[]): PipelineWarning[] {
  const seen = new Set<string>();
  return list.filter((w) => {
    const key = `${w.code} ${w.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function dedupeAdvisories(list: Advisory[]): Advisory[] {
  const seen = new Set<string>();
  return list.filter((a) => {
    const key = `${a.code} ${a.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const elementwiseMaxMargins = (a: Margins, b: Margins): Margins => ({
  top: Math.max(a.top, b.top),
  right: Math.max(a.right, b.right),
  bottom: Math.max(a.bottom, b.bottom),
  left: Math.max(a.left, b.left),
});

export function scaleDomainSnapshot(scale: PositionScale): readonly CellValue[] {
  return Object.freeze([...scale.domain]);
}
