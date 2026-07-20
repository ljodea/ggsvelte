/**
 * Spec-driven axis tick formatters and semantic value formatters.
 */
import type { PositionScaleSpec, TemporalKind } from "@ggsvelte/spec";

import type { TickFormatter } from "../layout/layout.js";
import { compileTemporalLabelFormat, formatTime, numberFormatter } from "../layout/format.js";
import { defaultTickFormat, tickStep } from "../layout/ticks.js";
import { defaultLogTickFormat } from "../layout/ticks.js";
import { defaultTimeTickFormat } from "../layout/time.js";
import type { PositionScale } from "../scales/train.js";
import { cellToNumber, type CellValue } from "../table.js";

import type { AxisValueFormatter, PipelineWarning } from "./types.js";

export function makeAxisFormatter(
  axis: "x" | "y",
  scale: PositionScale,
  config: PositionScaleSpec | undefined,
  warnings: PipelineWarning[],
  resolvedTemporalKind?: TemporalKind | null,
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
  const labels = config?.dateLabels ?? config?.labels;
  if (labels === undefined) {
    if (scale.type !== "time" || config === undefined) return undefined;
    const kind = resolvedTemporalKind ?? config.temporalKind ?? "datetime";
    const format = compileTemporalLabelFormat(
      kind === "date" ? "%Y-%m-%d" : "%Y-%m-%d %H:%M:%S %Z",
      {
        kind,
        locale: config.locale ?? "en-US",
        timezone: config.timezone ?? "UTC",
      },
    );
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
        kind: config.temporalKind ?? "datetime",
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
      : scale.type === "log"
        ? defaultLogTickFormat
        : defaultTickFormat(tickStep(scale.domain[0], scale.domain[1], 5));
  return (value) => {
    if (value === null) return "–";
    const numeric = valueToNumber?.(value) ?? cellToNumber(value);
    return custom === undefined ? fallback(numeric) : custom(numeric, NaN);
  };
}
