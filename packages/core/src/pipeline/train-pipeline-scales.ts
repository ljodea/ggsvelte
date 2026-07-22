/**
 * Train fixed/free positional scales and global color/fill scales for a run.
 */
import type { GuideSpec } from "@ggsvelte/spec";
import { trainPipelineColorScales } from "./train-pipeline-scales-color.js";
import type { TrainPipelineScalesInput } from "./train-pipeline-scales-input.js";
import { trainPipelinePositionScales } from "./train-pipeline-scales-position.js";
import { trainPipelineStyleScales } from "./train-pipeline-scales-style.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales-types.js";

export type { TrainedPipelineScales } from "./train-pipeline-scales-types.js";
export type { TrainPipelineScalesInput } from "./train-pipeline-scales-input.js";

export function trainPipelineScales(input: TrainPipelineScalesInput): TrainedPipelineScales {
  const {
    normalized,
    options,
    table,
    sourceTable,
    bindings,
    facetPanels,
    panelFrames,
    freeX,
    freeY,
    xConversion,
    yConversion,
    editionDefaults,
    warnings,
    advisories,
  } = input;

  const sourceScalesConfig = normalized.scales ?? {};
  const withResolvedParser = (
    axis: "x" | "y",
    conversion: typeof xConversion,
  ): (typeof sourceScalesConfig)["x"] => {
    const config = sourceScalesConfig[axis];
    if (
      config === undefined ||
      config.parse !== undefined ||
      conversion.parser === "auto" ||
      config.type === "band" ||
      config.type === "linear" ||
      config.type === "log"
    ) {
      return config;
    }
    // This is an internal effective config only: the canonical PortableSpec
    // remains untouched while domains/breaks reuse the source-column decision.
    return { ...config, parse: conversion.parser };
  };
  const scalesConfig: NonNullable<typeof normalized.scales> = { ...sourceScalesConfig };
  const resolvedX = withResolvedParser("x", xConversion);
  const resolvedY = withResolvedParser("y", yConversion);
  if (resolvedX !== undefined) scalesConfig.x = resolvedX;
  if (resolvedY !== undefined) scalesConfig.y = resolvedY;
  for (const aesthetic of [
    "x",
    "y",
    "color",
    "fill",
    "size",
    "linewidth",
    "alpha",
    "shape",
    "linetype",
  ] as const) {
    const top = normalized.guides?.[aesthetic];
    if (top === undefined) continue;
    const scale = (scalesConfig[aesthetic] ?? {}) as { guide?: GuideSpec };
    const local = scale.guide;
    const guide: GuideSpec =
      local !== undefined && local.type === top.type && top.type !== "none"
        ? ({
            ...local,
            ...top,
            theme: {
              ...(local.type === "none" ? undefined : local.theme),
              ...top.theme,
            },
          } as GuideSpec)
        : top;
    Object.assign(scalesConfig, { [aesthetic]: { ...scale, guide } });
  }
  const position = trainPipelinePositionScales({
    scalesConfig,
    facetPanels,
    panelFrames,
    freeX,
    freeY,
    warnings,
    advisories,
  });
  const color = trainPipelineColorScales({
    scalesConfig,
    labs: normalized.labs ?? {},
    allFrames: position.allFrames,
    bindings,
    table,
    sourceTable,
    options,
    editionDefaults,
    warnings,
    advisories,
  });
  const styles = trainPipelineStyleScales({
    scalesConfig,
    labs: normalized.labs ?? {},
    allFrames: position.allFrames,
    bindings,
    table,
    sourceTable,
    options,
    warnings,
    advisories,
  });

  return {
    ...position,
    ...color,
    ...styles,
    scalesConfig,
  };
}
