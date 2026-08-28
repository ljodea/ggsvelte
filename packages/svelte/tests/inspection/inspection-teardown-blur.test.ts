/**
 * Pure unit tests for inspection/teardown.ts decision tables:
 * resolveSurfaceBlurAction and shouldClosePinnedOnOutsidePointer.
 */
import { describe, expect, it } from "vitest";

import {
  resolveSurfaceBlurAction,
  shouldClosePinnedOnOutsidePointer,
} from "../../src/lib/inspection/teardown.js";
describe("resolveSurfaceBlurAction", () => {
  it("ignores when relatedTarget is inside the plot root", () => {
    expect(
      resolveSurfaceBlurAction({
        relatedTargetInsideRoot: true,
        inspectionState: "transient",
      }),
    ).toEqual({ type: "ignore" });
    expect(
      resolveSurfaceBlurAction({
        relatedTargetInsideRoot: true,
        inspectionState: "pinned",
      }),
    ).toEqual({ type: "ignore" });
    expect(
      resolveSurfaceBlurAction({
        relatedTargetInsideRoot: true,
        inspectionState: "none",
      }),
    ).toEqual({ type: "ignore" });
  });

  it("keeps pinned inspection when focus leaves the root", () => {
    expect(
      resolveSurfaceBlurAction({
        relatedTargetInsideRoot: false,
        inspectionState: "pinned",
      }),
    ).toEqual({ type: "blur-keep-pinned" });
  });

  it("clears inspection for transient and none when focus leaves the root", () => {
    expect(
      resolveSurfaceBlurAction({
        relatedTargetInsideRoot: false,
        inspectionState: "transient",
      }),
    ).toEqual({ type: "blur-clear-inspection" });
    expect(
      resolveSurfaceBlurAction({
        relatedTargetInsideRoot: false,
        inspectionState: "none",
      }),
    ).toEqual({ type: "blur-clear-inspection" });
  });
});

describe("shouldClosePinnedOnOutsidePointer", () => {
  it("closes only when pinned and target is outside the root", () => {
    expect(
      shouldClosePinnedOnOutsidePointer({
        inspectionState: "pinned",
        targetInsideRoot: false,
      }),
    ).toBe(true);
  });

  it("does not close for non-pinned inspection states", () => {
    for (const inspectionState of ["transient", "none", null, undefined] as const) {
      expect(
        shouldClosePinnedOnOutsidePointer({
          inspectionState,
          targetInsideRoot: false,
        }),
      ).toBe(false);
    }
  });

  it("does not close when target is inside the root", () => {
    expect(
      shouldClosePinnedOnOutsidePointer({
        inspectionState: "pinned",
        targetInsideRoot: true,
      }),
    ).toBe(false);
  });

  it("does not close when unpinned and inside", () => {
    expect(
      shouldClosePinnedOnOutsidePointer({
        inspectionState: "transient",
        targetInsideRoot: true,
      }),
    ).toBe(false);
  });
});
