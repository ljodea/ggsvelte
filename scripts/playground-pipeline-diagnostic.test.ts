import { describe, expect, test } from "bun:test";

import { PipelineError } from "@ggsvelte/core";

import { pipelineErrorToPlaygroundDiagnostic } from "../apps/docs/src/lib/playground-pipeline-diagnostic";

const diagnosticWithFix = {
  code: "INVALID_SCALE",
  severity: "error" as const,
  path: "scales.x",
  problem: "Scale failed.",
  cause: "bad domain",
  fixes: [{ description: "Use a continuous scale." }],
  documentationUrl: "https://example.test/scale",
};

describe("pipelineErrorToPlaygroundDiagnostic", () => {
  test("maps PipelineError code, path, message, and first fix description", () => {
    const error = new PipelineError(
      "INVALID_SCALE",
      "scales.x",
      "Scale failed.",
      diagnosticWithFix,
    );
    expect(pipelineErrorToPlaygroundDiagnostic(error)).toEqual({
      source: "pipeline",
      code: "INVALID_SCALE",
      path: "scales.x",
      message: "Scale failed.",
      fix: "Use a continuous scale.",
    });
  });

  test("maps PipelineError without fixes without a fix field", () => {
    const error = new PipelineError("RENDER_FAILED", "layers[0]", "Boom");
    expect(pipelineErrorToPlaygroundDiagnostic(error)).toEqual({
      source: "pipeline",
      code: "RENDER_FAILED",
      path: "layers[0]",
      message: "Boom",
    });
  });

  test("maps generic Error to render-failed with message", () => {
    expect(pipelineErrorToPlaygroundDiagnostic(new Error("canvas refused"))).toEqual({
      source: "pipeline",
      code: "render-failed",
      path: "",
      message: "canvas refused",
      fix: "Adjust the PortableSpec or reset the source.",
    });
  });

  test("maps non-Error unknown to default message", () => {
    expect(pipelineErrorToPlaygroundDiagnostic("nope")).toEqual({
      source: "pipeline",
      code: "render-failed",
      path: "",
      message: "The chart could not render.",
      fix: "Adjust the PortableSpec or reset the source.",
    });
  });
});
