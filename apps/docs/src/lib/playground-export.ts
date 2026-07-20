import { PipelineError, renderToSVGString } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

import type { PlaygroundDiagnostic } from "./playground-state";

export type PlaygroundSVGExportResult =
  | {
      readonly ok: true;
      readonly filename: "ggsvelte-chart.svg";
      readonly svg: string;
    }
  | {
      readonly ok: false;
      readonly diagnostic: PlaygroundDiagnostic;
    };

type SVGRenderer = typeof renderToSVGString;

/** Serialize only an already validated, render-confirmed PortableSpec. */
export function playgroundSVGExport(
  spec: PortableSpec,
  render: SVGRenderer = renderToSVGString,
): PlaygroundSVGExportResult {
  try {
    return {
      ok: true,
      filename: "ggsvelte-chart.svg",
      svg: render(spec, {
        width: spec.width ?? 960,
        height: spec.height ?? 540,
        maxMarks: 100_000,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      diagnostic: {
        source: "export",
        code: error instanceof PipelineError ? error.code : "svg-export-failed",
        path: error instanceof PipelineError ? error.path : "",
        message: error instanceof Error ? error.message : "The SVG export could not be serialized.",
        fix: "Keep the current chart, then retry or reduce the spec before exporting.",
      },
    };
  }
}
