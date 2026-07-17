/**
 * Canvas first-paint readiness for GGPlot compositing.
 *
 * Readiness waits until every canvas stratum of the current model run has
 * painted at least once. Tracking is by distinct stratum key (not raw
 * notification count) so a re-attached canvas cannot mark the plot ready
 * before sibling strata paint.
 */

export type PlotReadyInput = {
  readonly hasModel: boolean;
  readonly widthMode: "fixed" | "container";
  readonly containerHasPositiveWidth: boolean;
  readonly hasCanvas: boolean;
  /** True when every canvas stratum of the current model run has painted. */
  readonly paintComplete: boolean;
};

/**
 * VR / screenshot readiness predicate for `[data-gg-ready]`.
 * Container width must be positive only when width is container-responsive.
 * Canvas plots additionally require paintComplete.
 */
export function isPlotReady(input: PlotReadyInput): boolean {
  if (!input.hasModel) return false;
  if (input.widthMode === "container" && !input.containerHasPositiveWidth) return false;
  if (input.hasCanvas && !input.paintComplete) return false;
  return true;
}

export type PaintLedger = {
  /** Record that a canvas stratum painted for `runId`. */
  notify(runId: number, stratumKey: string): void;
  /** Distinct strata painted for the current run. */
  readonly paintedCount: number;
  /** Run id of the current paint set, or -1 before any notify. */
  readonly paintedRunId: number;
  /**
   * True when `runId` matches the ledger run and at least `canvasCount`
   * distinct stratum keys have notified. `canvasCount === 0` is complete
   * only when the ledger run already matches (including the initial -1 run).
   */
  isComplete(runId: number, canvasCount: number): boolean;
};

/** Mutable paint ledger owned by one GGPlot instance. */
export function createPaintLedger(): PaintLedger {
  let paintedRunId = -1;
  const paintedKeys = new Set<string>();
  return {
    notify(runId: number, stratumKey: string): void {
      if (paintedRunId !== runId) {
        paintedRunId = runId;
        paintedKeys.clear();
      }
      paintedKeys.add(stratumKey);
    },
    get paintedCount(): number {
      return paintedKeys.size;
    },
    get paintedRunId(): number {
      return paintedRunId;
    },
    isComplete(runId: number, canvasCount: number): boolean {
      return paintedRunId === runId && paintedKeys.size >= canvasCount;
    },
  };
}
