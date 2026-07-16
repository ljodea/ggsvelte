import { describe, expect, it } from "vitest";

import type { InteractionTool } from "../src/lib/interaction.js";
import {
  resolveCaptureClickAction,
  resolvePointerDownAction,
  resolvePointerUpAction,
  type SurfaceClickInput,
  type SurfacePointerDownInput,
  type SurfacePointerUpInput,
} from "../src/lib/plot-surface-pointer.js";

const down = (
  overrides: Partial<SurfacePointerDownInput> & Pick<SurfacePointerDownInput, "activeTool">,
): SurfacePointerDownInput => ({
  pointerType: "mouse",
  button: 0,
  areaAwaitingSecond: false,
  hasBrushDraft: false,
  ...overrides,
});

const up = (
  overrides: Partial<SurfacePointerUpInput> & Pick<SurfacePointerUpInput, "activeTool">,
): SurfacePointerUpInput => ({
  pointerType: "mouse",
  inspectEnabled: true,
  pinEnabled: false,
  hasTouchInspectStart: false,
  touchInspectMoved: false,
  brushing: false,
  hasBrushDraft: false,
  ...overrides,
});

const click = (
  overrides: Partial<SurfaceClickInput> & Pick<SurfaceClickInput, "activeTool">,
): SurfaceClickInput => ({
  suppressClick: false,
  pointSelectEnabled: false,
  inspectEnabled: true,
  pinEnabled: false,
  hasInspection: false,
  ...overrides,
});

describe("resolvePointerDownAction", () => {
  it("starts touch-inspect before button/tool checks (non-primary button still starts)", () => {
    expect(
      resolvePointerDownAction(
        down({
          activeTool: "inspect",
          pointerType: "touch",
          button: 1,
        }),
      ),
    ).toEqual({ type: "touch-inspect-start" });
  });

  it("ignores non-primary button for area tools", () => {
    expect(resolvePointerDownAction(down({ activeTool: "select-area", button: 2 }))).toEqual({
      type: "none",
    });
  });

  it.each(["inspect", "point"] as const)("ignores non-area tool %s on primary button", (tool) => {
    expect(resolvePointerDownAction(down({ activeTool: tool }))).toEqual({
      type: "none",
    });
  });

  it.each(["select-area", "zoom-area"] as const)(
    "%s begins a new area draft when not extending",
    (tool: InteractionTool) => {
      expect(resolvePointerDownAction(down({ activeTool: tool }))).toEqual({
        type: "begin-area",
        extendExisting: false,
      });
    },
  );

  it("extends only when awaiting second corner AND draft exists", () => {
    expect(
      resolvePointerDownAction(
        down({
          activeTool: "select-area",
          areaAwaitingSecond: true,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({ type: "begin-area", extendExisting: true });
  });

  it("does not extend when awaiting second corner but draft is missing", () => {
    expect(
      resolvePointerDownAction(
        down({
          activeTool: "zoom-area",
          areaAwaitingSecond: true,
          hasBrushDraft: false,
        }),
      ),
    ).toEqual({ type: "begin-area", extendExisting: false });
  });

  it("does not extend when draft exists but reducer is not awaiting second", () => {
    expect(
      resolvePointerDownAction(
        down({
          activeTool: "select-area",
          areaAwaitingSecond: false,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({ type: "begin-area", extendExisting: false });
  });
});

describe("resolvePointerUpAction", () => {
  it("resolves touch inspect tap with pin flag", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "inspect",
          pointerType: "touch",
          inspectEnabled: true,
          hasTouchInspectStart: true,
          touchInspectMoved: false,
          pinEnabled: true,
        }),
      ),
    ).toEqual({ type: "touch-inspect-tap", pin: true });

    expect(
      resolvePointerUpAction(
        up({
          activeTool: "inspect",
          pointerType: "touch",
          inspectEnabled: true,
          hasTouchInspectStart: true,
          touchInspectMoved: false,
          pinEnabled: false,
        }),
      ),
    ).toEqual({ type: "touch-inspect-tap", pin: false });
  });

  it("ignores touch inspect drag (moved past threshold)", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "inspect",
          pointerType: "touch",
          inspectEnabled: true,
          hasTouchInspectStart: true,
          touchInspectMoved: true,
        }),
      ),
    ).toEqual({ type: "touch-inspect-drag-ignore" });
  });

  it("does not take touch-inspect path when inspect disabled or tool changed", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "inspect",
          pointerType: "touch",
          inspectEnabled: false,
          hasTouchInspectStart: true,
          brushing: true,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({ type: "finish-brush" });

    expect(
      resolvePointerUpAction(
        up({
          activeTool: "select-area",
          pointerType: "touch",
          inspectEnabled: true,
          hasTouchInspectStart: true,
          brushing: true,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({ type: "finish-brush" });
  });

  it("finishes brush only when both brushing and draft exist", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "select-area",
          brushing: true,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({ type: "finish-brush" });
  });

  it("returns none when brushing/draft state diverges", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "zoom-area",
          brushing: true,
          hasBrushDraft: false,
        }),
      ),
    ).toEqual({ type: "none" });

    expect(
      resolvePointerUpAction(
        up({
          activeTool: "zoom-area",
          brushing: false,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({ type: "none" });
  });
});

describe("resolveCaptureClickAction", () => {
  it("suppress outranks point and pin", () => {
    expect(
      resolveCaptureClickAction(
        click({
          activeTool: "point",
          suppressClick: true,
          pointSelectEnabled: true,
          hasInspection: true,
          pinEnabled: true,
          inspectEnabled: true,
        }),
      ),
    ).toEqual({ type: "suppress" });
  });

  it("toggles point selection when point tool and point select enabled", () => {
    expect(
      resolveCaptureClickAction(
        click({
          activeTool: "point",
          pointSelectEnabled: true,
        }),
      ),
    ).toEqual({ type: "toggle-point" });
  });

  it("toggles pin when inspect tool, inspection present, and pin enabled", () => {
    expect(
      resolveCaptureClickAction(
        click({
          activeTool: "inspect",
          inspectEnabled: true,
          pinEnabled: true,
          hasInspection: true,
        }),
      ),
    ).toEqual({ type: "toggle-pin" });
  });

  it("returns none without pin, inspection, or wrong tool", () => {
    expect(
      resolveCaptureClickAction(
        click({
          activeTool: "inspect",
          pinEnabled: true,
          hasInspection: false,
        }),
      ),
    ).toEqual({ type: "none" });

    expect(
      resolveCaptureClickAction(
        click({
          activeTool: "inspect",
          pinEnabled: false,
          hasInspection: true,
        }),
      ),
    ).toEqual({ type: "none" });

    expect(
      resolveCaptureClickAction(
        click({
          activeTool: "point",
          pointSelectEnabled: false,
        }),
      ),
    ).toEqual({ type: "none" });
  });
});
