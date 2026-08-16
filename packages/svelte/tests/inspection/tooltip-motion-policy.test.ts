/**
 * Pure unit tests for inspection/tooltip-motion.ts.
 */
import { describe, expect, it } from "vitest";

import {
  TOOLTIP_EASE,
  TOOLTIP_MOTION_MS,
  prefersReducedMotion,
  resolveTooltipDismissReason,
  resolveTooltipMotion,
  type TooltipMotionReason,
} from "../../src/lib/inspection/tooltip-motion.js";

describe("tooltip motion constants", () => {
  it("locks the chart-chrome opacity budget", () => {
    expect(TOOLTIP_MOTION_MS).toBe(160);
    expect(TOOLTIP_EASE).toBe("cubic-bezier(0.23, 1, 0.32, 1)");
  });
});

describe("prefersReducedMotion", () => {
  it("is false when matchMedia is missing or does not match", () => {
    expect(prefersReducedMotion(null)).toBe(false);
    expect(prefersReducedMotion(undefined)).toBe(false);
    expect(prefersReducedMotion({ matches: false })).toBe(false);
  });

  it("is true only when the query matches", () => {
    expect(prefersReducedMotion({ matches: true })).toBe(true);
  });
});

describe("resolveTooltipDismissReason", () => {
  it("treats Close and Escape as close", () => {
    expect(
      resolveTooltipDismissReason({
        explicitClose: true,
        pointerOnCapture: true,
      }),
    ).toBe("close");
    expect(
      resolveTooltipDismissReason({
        explicitClose: true,
        pointerOnCapture: false,
      }),
    ).toBe("close");
  });

  it("treats a null inspection while the pointer is on the plot as a miss", () => {
    expect(
      resolveTooltipDismissReason({
        explicitClose: false,
        pointerOnCapture: true,
      }),
    ).toBe("miss-on-plot");
  });

  it("treats a null inspection after the pointer left the plot as leave", () => {
    expect(
      resolveTooltipDismissReason({
        explicitClose: false,
        pointerOnCapture: false,
      }),
    ).toBe("leave-plot");
  });
});

describe("resolveTooltipMotion", () => {
  const rows: ReadonlyArray<{
    reason: TooltipMotionReason;
    sessionIn: boolean;
    reducedMotion: boolean;
    phase: "enter" | "none" | "exit";
    sessionOut: boolean;
  }> = [
    {
      reason: "hit",
      sessionIn: false,
      reducedMotion: false,
      phase: "enter",
      sessionOut: true,
    },
    {
      reason: "hit",
      sessionIn: true,
      reducedMotion: false,
      phase: "none",
      sessionOut: true,
    },
    {
      reason: "hit",
      sessionIn: false,
      reducedMotion: true,
      phase: "none",
      sessionOut: true,
    },
    {
      reason: "miss-on-plot",
      sessionIn: true,
      reducedMotion: false,
      phase: "none",
      sessionOut: true,
    },
    {
      reason: "miss-on-plot",
      sessionIn: false,
      reducedMotion: false,
      phase: "none",
      sessionOut: false,
    },
    {
      reason: "leave-plot",
      sessionIn: true,
      reducedMotion: false,
      phase: "exit",
      sessionOut: false,
    },
    {
      reason: "leave-plot",
      sessionIn: true,
      reducedMotion: true,
      phase: "none",
      sessionOut: false,
    },
    {
      reason: "leave-plot",
      sessionIn: false,
      reducedMotion: false,
      phase: "none",
      sessionOut: false,
    },
    {
      reason: "close",
      sessionIn: true,
      reducedMotion: false,
      phase: "exit",
      sessionOut: false,
    },
    {
      reason: "close",
      sessionIn: true,
      reducedMotion: true,
      phase: "none",
      sessionOut: false,
    },
  ];

  it("plays enter only on the first hit of a session, and exit only on session end", () => {
    for (const row of rows) {
      expect(
        resolveTooltipMotion({
          reason: row.reason,
          sessionActive: row.sessionIn,
          reducedMotion: row.reducedMotion,
        }),
      ).toEqual({
        phase: row.phase,
        sessionActive: row.sessionOut,
      });
    }
  });
});
