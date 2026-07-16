import { describe, expect, it } from "vitest";

import { createPaintLedger, isPlotReady } from "../src/lib/plot-paint.js";

describe("isPlotReady", () => {
  const readyBase = {
    hasModel: true,
    widthMode: "fixed" as const,
    containerHasPositiveWidth: false,
    hasCanvas: false,
    paintComplete: false,
  };

  it("is false without a model", () => {
    expect(isPlotReady({ ...readyBase, hasModel: false })).toBe(false);
  });

  it("requires positive container width only in container mode", () => {
    expect(
      isPlotReady({
        ...readyBase,
        widthMode: "container",
        containerHasPositiveWidth: false,
      }),
    ).toBe(false);
    expect(
      isPlotReady({
        ...readyBase,
        widthMode: "container",
        containerHasPositiveWidth: true,
      }),
    ).toBe(true);
    expect(
      isPlotReady({
        ...readyBase,
        widthMode: "fixed",
        containerHasPositiveWidth: false,
      }),
    ).toBe(true);
  });

  it("gates canvas plots on paintComplete", () => {
    expect(
      isPlotReady({
        ...readyBase,
        hasCanvas: true,
        paintComplete: false,
      }),
    ).toBe(false);
    expect(
      isPlotReady({
        ...readyBase,
        hasCanvas: true,
        paintComplete: true,
      }),
    ).toBe(true);
    // SVG-only plots do not wait on paint ledger.
    expect(
      isPlotReady({
        ...readyBase,
        hasCanvas: false,
        paintComplete: false,
      }),
    ).toBe(true);
  });
});

describe("createPaintLedger", () => {
  it("is incomplete until each distinct stratum key paints for the run", () => {
    const ledger = createPaintLedger();
    expect(ledger.isComplete(1, 2)).toBe(false);
    ledger.notify(1, "0");
    expect(ledger.isComplete(1, 2)).toBe(false);
    expect(ledger.paintedCount).toBe(1);
    expect(ledger.paintedRunId).toBe(1);
    ledger.notify(1, "1");
    expect(ledger.isComplete(1, 2)).toBe(true);
    expect(ledger.paintedCount).toBe(2);
  });

  it("ignores duplicate notifications for the same stratum key", () => {
    const ledger = createPaintLedger();
    ledger.notify(7, "canvas-0");
    ledger.notify(7, "canvas-0");
    ledger.notify(7, "canvas-0");
    expect(ledger.paintedCount).toBe(1);
    expect(ledger.isComplete(7, 2)).toBe(false);
    ledger.notify(7, "canvas-1");
    expect(ledger.isComplete(7, 2)).toBe(true);
  });

  it("resets when the run id changes (model replacement)", () => {
    const ledger = createPaintLedger();
    ledger.notify(1, "0");
    ledger.notify(1, "1");
    expect(ledger.isComplete(1, 2)).toBe(true);
    ledger.notify(2, "0");
    expect(ledger.paintedRunId).toBe(2);
    expect(ledger.paintedCount).toBe(1);
    expect(ledger.isComplete(1, 2)).toBe(false);
    expect(ledger.isComplete(2, 2)).toBe(false);
    ledger.notify(2, "1");
    expect(ledger.isComplete(2, 2)).toBe(true);
  });

  it("treats canvasCount 0 as complete for the matching run only when empty", () => {
    const ledger = createPaintLedger();
    // No paints yet, run id still sentinel -1.
    expect(ledger.isComplete(5, 0)).toBe(false);
    // After any notify establishes the run, zero canvases means complete.
    ledger.notify(5, "unused");
    // With canvasCount 0 we should not require strata; complete when run matches.
    const empty = createPaintLedger();
    // Explicit: zero canvas strata → complete iff we consider the run current.
    // Host only asks isComplete when hasCanvas; still define: count 0 ⇒ paintedCount >= 0
    // only when paintedRunId matches. Fresh ledger paintedRunId is -1.
    expect(empty.isComplete(-1, 0)).toBe(true);
    expect(empty.isComplete(1, 0)).toBe(false);
  });
});
