import { PipelineError } from "@ggsvelte/core";

import type { PlaygroundDiagnostic } from "./playground-state-types";

/**
 * Map a pipeline/render failure into the playground diagnostic surface.
 * Preserves PipelineError code/path/message and the first catalog fix description.
 */
export function pipelineErrorToPlaygroundDiagnostic(error: unknown): PlaygroundDiagnostic {
  if (error instanceof PipelineError) {
    return {
      source: "pipeline",
      code: error.code,
      path: error.path,
      message: error.message,
      ...(error.diagnostic?.fixes[0]?.description === undefined
        ? {}
        : { fix: error.diagnostic.fixes[0].description }),
    };
  }
  return {
    source: "pipeline",
    code: "render-failed",
    path: "",
    message: error instanceof Error ? error.message : "The chart could not render.",
    fix: "Adjust the PortableSpec or reset the source.",
  };
}
