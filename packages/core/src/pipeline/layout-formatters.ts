/**
 * Axis tick formatters and domain projection for layout.
 */
import type { PositionScaleSpec } from "@ggsvelte/spec";

import type { Domain, LayoutResult, TickFormatter } from "../layout/layout.js";
import { formatTime, numberFormatter } from "../layout/format.js";
import { defaultTickFormat, tickStep } from "../layout/ticks.js";
import { defaultLogTickFormat } from "../layout/ticks.js";
import { defaultTimeTickFormat } from "../layout/time.js";
import type { PositionScale } from "../scales/train.js";
import type { SceneTick } from "../scene.js";
import type { CellValue } from "../table.js";
import { cellToNumber } from "../table.js";

import type { AxisValueFormatter, PipelineWarning } from "./types.js";

export function layoutDomain(
  scale: PositionScale,
  breaks: readonly (number | string)[] | undefined,
): Domain {
  if (scale.type === "band") return { type: "band", categories: [...scale.domain] };
  const numericBreaks =
    breaks === undefined
      ? undefined
      : breaks.map((b) => cellToNumber(b as CellValue)).filter((v) => Number.isFinite(v));
  return {
    type: scale.type,
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
): TickFormatter | undefined {
  const labels = config?.labels;
  if (labels === undefined) return undefined;
  if (scale.type === "band") {
    warnings.push({
      code: "invalid-label-format",
      message: `scales.${axis}.labels format strings apply to continuous scales; the band ${axis} scale ignores it.`,
    });
    return undefined;
  }
  if (scale.type === "time") {
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
    const numeric = cellToNumber(value);
    return custom === undefined ? fallback(numeric) : custom(numeric, NaN);
  };
}

/** Project layout ticks through a scale onto an axis extent, in px. */
export function axisTicks(
  scale: PositionScale,
  ticks: LayoutResult["x"]["ticks"],
  extent: number,
  fromEnd: boolean,
): SceneTick[] {
  const out: SceneTick[] = [];
  for (const tick of ticks) {
    const t =
      scale.type === "band" ? scale.normalize(tick.value) : scale.normalize(tick.value as number);
    if (t === undefined || Number.isNaN(t)) continue;
    const pos = fromEnd ? extent - t * extent : t * extent;
    out.push({ pos, label: tick.labeled ? tick.label : "" });
  }
  return out;
}
