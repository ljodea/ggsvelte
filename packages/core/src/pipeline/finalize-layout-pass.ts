/**
 * Finalize phase: two-pass panel layout only.
 */
import { parseTemporalInterval, TemporalIntervalError, type PortableSpec } from "@ggsvelte/spec";

import { perfMark, perfMeasure } from "../perf.js";
import type { ThemeTokens } from "../theme.js";

import { computePanelLayout } from "./panel-layout.js";
import type { PanelLayoutResult } from "./panel-layout.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import { PipelineError, type PipelineWarning, type RunOptions } from "./types.js";

export function finalizePanelLayoutPass(input: {
  normalized: PortableSpec;
  options: RunOptions;
  theme: ThemeTokens;
  flip: boolean;
  prepared: PreparedPanels;
  trained: TrainedPipelineScales;
  warnings: PipelineWarning[];
}): PanelLayoutResult {
  const { normalized, options, theme, flip, prepared, trained, warnings } = input;
  const { faceted, freeX, freeY, nrow, ncol, facetPanels } = prepared;
  const {
    xTraining,
    yTraining,
    panelScales,
    colorResolution,
    fillResolution,
    scalesConfig,
    allFrames,
  } = trained;

  const temporalKind = (axis: "x" | "y") => {
    const requested =
      axis === "x" ? prepared.xConversion.requestedKind : prepared.yConversion.requestedKind;
    if (requested !== undefined) return requested;
    const kinds = prepared.scaleDecisions
      .filter((decision) => decision.aesthetic === axis && decision.status === "temporal")
      .map((decision) => decision.kind)
      .filter((kind): kind is "date" | "datetime" => kind !== null);
    return kinds.includes("datetime") ? "datetime" : (kinds[0] ?? null);
  };

  perfMark("ggsvelte:layout:start");
  let panelLayout: PanelLayoutResult;
  try {
    panelLayout = computePanelLayout({
      flip,
      faceted,
      freeX,
      freeY,
      nrow,
      ncol,
      facetPanels,
      panelScales,
      allFrames,
      labs: normalized.labs ?? {},
      scalesConfig,
      xScale: xTraining.scale,
      yScale: yTraining.scale,
      xTemporalKind: temporalKind("x"),
      yTemporalKind: temporalKind("y"),
      colorLegend: colorResolution.legendInput,
      fillLegend: fillResolution.legendInput,
      legendOrder: normalized.legend?.order ?? "stable-domain",
      theme,
      options,
      warnings,
    });
  } catch (error) {
    if (!(error instanceof TemporalIntervalError)) throw error;
    const matchesInterval = (value: string | undefined) => {
      if (value === undefined) return false;
      try {
        return parseTemporalInterval(value).key === error.value;
      } catch {
        return value === error.value;
      }
    };
    const axis = (["x", "y"] as const).find(
      (candidate) =>
        matchesInterval(scalesConfig[candidate]?.dateBreaks) ||
        matchesInterval(scalesConfig[candidate]?.dateMinorBreaks),
    );
    const option =
      axis !== undefined && matchesInterval(scalesConfig[axis]?.dateMinorBreaks)
        ? "dateMinorBreaks"
        : "dateBreaks";
    const path = axis === undefined ? "/scales" : `/scales/${axis}/${option}`;
    const code = error.message.includes("progression")
      ? "temporal-break-progression"
      : "temporal-break-limit";
    throw new PipelineError(code, path, error.message, {
      code,
      severity: "error",
      path,
      problem:
        code === "temporal-break-limit"
          ? "The requested temporal interval produces too many ticks."
          : "The requested temporal interval did not advance monotonically.",
      cause: error.message,
      fixes: [{ description: "Choose a coarser calendar interval." }],
      documentationUrl: "/guide/temporal-scales#explicit-intervals",
    });
  }
  perfMark("ggsvelte:layout:end");
  perfMeasure("ggsvelte:layout", "ggsvelte:layout:start", "ggsvelte:layout:end");
  return panelLayout;
}
