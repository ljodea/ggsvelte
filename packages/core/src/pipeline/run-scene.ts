/** Lean pipeline endpoint for renderers that consume only the computed Scene. */
import type { PortableSpec, SpecInput } from "@ggsvelte/spec";

import { EDITION_DEFAULTS_SLIM } from "../editions-slim.js";
import { perfMark, perfMeasure } from "../perf.js";
import type { Scene } from "../scene.js";

import { finalizeScene } from "./finalize.js";
import { preparePipelineRun } from "./prepare-run.js";
import type { RunOptions } from "./types.js";

export function runScene(spec: SpecInput | PortableSpec, options: RunOptions): Scene {
  perfMark("ggsvelte:pipeline:start");
  const { scene } = finalizeScene(
    preparePipelineRun(spec, {
      ...options,
      editions: options.editions ?? EDITION_DEFAULTS_SLIM,
    }),
  );
  perfMark("ggsvelte:pipeline:end");
  perfMeasure("ggsvelte:pipeline", "ggsvelte:pipeline:start", "ggsvelte:pipeline:end");
  return scene;
}
