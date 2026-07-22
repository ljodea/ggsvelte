/**
 * Finalize phase: two-pass panel layout only.
 */
import { parseTemporalColumn, type CellValue, type PortableSpec } from "@ggsvelte/spec";

import { perfMark, perfMeasure } from "../perf.js";
import type { ThemeTokens } from "../theme.js";

import { TemporalGuideIntervalError } from "../layout/temporal-guide.js";
import { prepareLegendInputs, resolveAxisGuide } from "./guide-config.js";
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
    styleResolutions,
    scalesConfig,
    allFrames,
  } = trained;

  const temporalKind = (axis: "x" | "y") => {
    const conversion = axis === "x" ? prepared.xConversion : prepared.yConversion;
    if (conversion.requestedKind !== undefined) return conversion.requestedKind;
    const kinds = prepared.scaleDecisions
      .filter((decision) => decision.aesthetic === axis && decision.status === "temporal")
      .map((decision) => decision.kind)
      .filter((kind): kind is "date" | "datetime" => kind !== null);
    if (kinds.length > 0) return kinds.includes("datetime") ? "datetime" : kinds[0]!;

    const scalarValues: CellValue[] = [];
    for (const layer of normalized.layers) {
      const params = layer.params as
        | { xintercept?: CellValue | CellValue[]; yintercept?: CellValue | CellValue[] }
        | undefined;
      const value = axis === "x" ? params?.xintercept : params?.yintercept;
      if (value !== undefined) scalarValues.push(...(Array.isArray(value) ? value : [value]));
    }
    if (scalarValues.length > 0 && conversion.requestedTime) {
      const decision = parseTemporalColumn(
        scalarValues,
        conversion.parser,
        conversion.options,
      ).decision;
      if (decision.kind !== null) return decision.kind;
    }

    const config = normalized.scales?.[axis];
    if (conversion.requestedTime) {
      for (const values of [config?.domain, config?.breaks]) {
        if (values === undefined || values.length === 0) continue;
        const decision = parseTemporalColumn(
          values,
          conversion.parser,
          conversion.options,
        ).decision;
        if (decision.kind !== null) return decision.kind;
      }
    }

    const scale = axis === "x" ? xTraining.scale : yTraining.scale;
    return scale.type === "time" && conversion.requestedTime ? "datetime" : null;
  };

  const xGuide = resolveAxisGuide("x", scalesConfig, normalized.guides);
  const yGuide = resolveAxisGuide("y", scalesConfig, normalized.guides);
  const labs = { ...normalized.labs };
  if (xGuide.visible) {
    if (xGuide.title !== undefined) labs.x = xGuide.title;
  } else labs.x = "";
  if (yGuide.visible) {
    if (yGuide.title !== undefined) labs.y = yGuide.title;
  } else labs.y = "";
  const legendInputs = prepareLegendInputs({
    items: [
      { input: colorResolution.legendInput, plan: colorResolution.guidePlan },
      { input: fillResolution.legendInput, plan: fillResolution.guidePlan },
      ...Object.values(styleResolutions).map((resolution) => ({
        input: resolution.legendInput,
        plan: resolution.guidePlan,
      })),
    ],
    bindings: prepared.bindings,
    scales: scalesConfig,
    guides: normalized.guides,
  });

  perfMark("ggsvelte:layout:start");
  let panelLayout: PanelLayoutResult;
  try {
    panelLayout = computePanelLayout({
      flip,
      faceted,
      freeX,
      freeY,
      ...(normalized.coord?.type === "fixed" && { coordFixed: normalized.coord }),
      nrow,
      ncol,
      facetPanels,
      panelScales,
      allFrames,
      hGuide: flip ? yGuide : xGuide,
      vGuide: flip ? xGuide : yGuide,
      labs,
      scalesConfig,
      xScale: xTraining.scale,
      yScale: yTraining.scale,
      xTemporalKind: temporalKind("x"),
      yTemporalKind: temporalKind("y"),
      legendInputs,
      legendOrder: normalized.legend?.order ?? "stable-domain",
      theme,
      layoutAxisTitleSize: Math.max(
        theme.axisTitleSize,
        xGuide.theme?.titleSize ?? 0,
        yGuide.theme?.titleSize ?? 0,
      ),
      layoutAxisTextSize: Math.max(
        theme.axisTextSize,
        xGuide.theme?.labelSize ?? 0,
        yGuide.theme?.labelSize ?? 0,
      ),
      options,
      warnings,
    });
  } catch (error) {
    if (!(error instanceof TemporalGuideIntervalError)) throw error;
    const intervalError = error.cause;
    const path = `/scales/${error.aesthetic}/${error.option}`;
    const code = intervalError.message.includes("progression")
      ? "temporal-break-progression"
      : "temporal-break-limit";
    throw new PipelineError(code, path, intervalError.message, {
      code,
      severity: "error",
      path,
      problem:
        code === "temporal-break-limit"
          ? "The requested temporal interval produces too many ticks."
          : "The requested temporal interval did not advance monotonically.",
      cause: intervalError.message,
      fixes: [{ description: "Choose a coarser calendar interval." }],
      documentationUrl: "/guide/temporal-scales#explicit-intervals",
    });
  }
  perfMark("ggsvelte:layout:end");
  perfMeasure("ggsvelte:layout", "ggsvelte:layout:start", "ggsvelte:layout:end");
  return panelLayout;
}
