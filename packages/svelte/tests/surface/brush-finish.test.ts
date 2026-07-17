import { describe, expect, it } from "vitest";

import type { InteractionTool } from "../../src/lib/interaction/interaction.js";
import {
  resolveFinishBrushAction,
  resolvePointerFinishBrushAction,
} from "../../src/lib/surface/brush-finish.js";

describe("resolveFinishBrushAction", () => {
  const corners = { x0: 1, y0: 2, x1: 3, y1: 4 } as const;
  const rect = { x0: 10, y0: 20, x1: 40, y1: 50 } as const;
  const tooSmall = { kind: "too-small" as const, corners };
  const commit = { kind: "commit" as const, rect };

  it("keeps second corner with payload on too-small for any tool", () => {
    for (const activeTool of [
      "select-area",
      "zoom-area",
      "inspect",
      "point",
    ] as const satisfies readonly InteractionTool[]) {
      expect(resolveFinishBrushAction({ ended: tooSmall, activeTool })).toEqual({
        type: "keep-second-corner",
        corners,
      });
    }
  });

  it("routes commit + select-area to select-end with rect payload", () => {
    expect(resolveFinishBrushAction({ ended: commit, activeTool: "select-area" })).toEqual({
      type: "select-end",
      rect,
    });
  });

  it("routes commit + zoom-area to zoom-end with rect payload", () => {
    expect(resolveFinishBrushAction({ ended: commit, activeTool: "zoom-area" })).toEqual({
      type: "zoom-end",
      rect,
    });
  });

  it("routes commit + non-area tools to end-area (clear draft, no emit)", () => {
    expect(resolveFinishBrushAction({ ended: commit, activeTool: "inspect" })).toEqual({
      type: "end-area",
    });
    expect(resolveFinishBrushAction({ ended: commit, activeTool: "point" })).toEqual({
      type: "end-area",
    });
  });
});

describe("resolvePointerFinishBrushAction", () => {
  it("composes free-corner evaluation into select-end", () => {
    expect(
      resolvePointerFinishBrushAction({
        brushCorners: { x0: 10, y0: 20, x1: 10, y1: 20 },
        endPoint: { x: 40, y: 50 },
        activeTool: "select-area",
      }),
    ).toEqual({
      type: "select-end",
      rect: { x0: 10, y0: 20, x1: 40, y1: 50 },
    });
  });

  it("composes too-small free corner into keep-second-corner", () => {
    expect(
      resolvePointerFinishBrushAction({
        brushCorners: { x0: 10, y0: 10, x1: 10, y1: 10 },
        endPoint: { x: 12, y: 12 },
        activeTool: "zoom-area",
      }),
    ).toEqual({
      type: "keep-second-corner",
      corners: { x0: 10, y0: 10, x1: 12, y1: 12 },
    });
  });
});
