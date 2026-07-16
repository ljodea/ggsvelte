/**
 * Characterization tests for pipeline run setup (normalize/edition/theme/flip).
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { setupPipelineRun } from "../src/pipeline/setup-run.ts";
import { runPipeline } from "../src/pipeline.ts";
import type { PipelineWarning } from "../src/pipeline/types.ts";

describe("setupPipelineRun", () => {
  it("normalizes a point spec and resolves default theme", () => {
    const warnings: PipelineWarning[] = [];
    const setup = setupPipelineRun(
      gg([{ x: 1, y: 2 }], aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      undefined,
      warnings,
    );
    expect(setup.normalized.layers).toHaveLength(1);
    expect(setup.theme).toBeTruthy();
    expect(setup.flip).toBe(false);
    expect(warnings).toHaveLength(0);
  });

  it("detects coord flip", () => {
    const setup = setupPipelineRun(
      gg([{ x: 1, y: 2 }], aes({ x: "x", y: "y" }))
        .geomPoint()
        .coord({ type: "flip" })
        .spec(),
      undefined,
      [],
    );
    expect(setup.flip).toBe(true);
  });

  it("rejects unknown theme names as tier-1 structured errors", () => {
    try {
      runPipeline(
        {
          data: { values: [{ x: 1, y: 2 }] },
          layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
          theme: "definitely-not-a-real-theme",
        } as never,
        { width: 100, height: 100 },
      );
      expect.unreachable("should throw");
    } catch (e) {
      // schema rejects first (SpecValidationError); setup also maps unknown themes
      // to PipelineError for programmatic theme tables.
      expect((e as Error).name).toMatch(/SpecValidationError|PipelineError/);
    }
  });
});
