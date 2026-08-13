/**
 * Core runPipeline orchestration: prepare shared state, then build the full
 * RenderModel contract.
 */
import type { SpecInput, PortableSpec } from "@ggsvelte/spec";

import { perfMark, perfMeasure } from "../perf.js";

import { finalize } from "./finalize.js";
import { preparePipelineRun } from "./prepare-run.js";
import type { RenderModel, RunOptions } from "./types.js";

export function runPipeline(spec: SpecInput | PortableSpec, options: RunOptions): RenderModel {
  perfMark("ggsvelte:pipeline:start");
  const model = finalize(preparePipelineRun(spec, options));
  perfMark("ggsvelte:pipeline:end");
  perfMeasure("ggsvelte:pipeline", "ggsvelte:pipeline:start", "ggsvelte:pipeline:end");
  return model;
}
