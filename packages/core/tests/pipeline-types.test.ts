/**
 * Characterization for pipeline type contract exports (public + frame barrels).
 */
import { describe, expect, it } from "bun:test";

import { CANVAS_AUTO_THRESHOLD, NO_ROW, PipelineError, colorOf } from "../src/pipeline/types.ts";
import type { ResolvedColorScale } from "../src/pipeline/types.ts";

describe("pipeline types contract", () => {
  it("exports the canvas auto threshold and NO_ROW sentinel", () => {
    expect(CANVAS_AUTO_THRESHOLD).toBe(2000);
    expect(NO_ROW).toBe(0xffffffff);
  });

  it("PipelineError is a structured tier-1 error", () => {
    const err = new PipelineError("test-code", "/path", "message");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("PipelineError");
    expect(err.code).toBe("test-code");
    expect(err.path).toBe("/path");
    expect(err.message).toBe("message");
  });

  it("colorOf falls back to grey for unknown ordinal values", () => {
    const resolved: ResolvedColorScale = {
      kind: "ordinal",
      scale: {
        domain: ["a"],
        colorOf: (v: unknown) => (v === "a" ? "#111111" : undefined),
        state: { domain: ["a"], assignments: { a: 0 }, scheme: "test", reverse: false },
        warnings: [],
      },
    };
    expect(colorOf(resolved, "a")).toBe("#111111");
    expect(colorOf(resolved, "missing")).toBe("#999999");
  });
});
