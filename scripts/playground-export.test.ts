import { describe, expect, test } from "bun:test";

import { PipelineError } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

import { playgroundSVGExport } from "../apps/docs/src/lib/playground-export";

const spec: PortableSpec = {
  edition: 2,
  data: { values: [{ x: 1, y: 2 }] },
  layers: [
    {
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "x" }, y: { field: "y" } },
    },
  ],
  labs: { title: "Exported chart" },
};

describe("playground SVG export", () => {
  test("serializes one render-confirmed spec to a deterministic standalone SVG", () => {
    const result = playgroundSVGExport(spec);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.filename).toBe("ggsvelte-chart.svg");
    expect(result.svg).toStartWith("<svg");
    expect(result.svg).toContain("Exported chart");
    expect(result.svg).toContain('role="img"');
  });

  test("returns a source-aware failure without a partial SVG", () => {
    const result = playgroundSVGExport(spec, () => {
      throw new PipelineError("renderer-failure", "", "The renderer stopped.");
    });
    expect(result).toEqual({
      ok: false,
      diagnostic: {
        source: "export",
        code: "renderer-failure",
        path: "",
        message: "The renderer stopped.",
        fix: "Keep the current chart, then retry or reduce the spec before exporting.",
      },
    });
    expect("svg" in result).toBe(false);
  });
});
