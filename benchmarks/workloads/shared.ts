/// <reference lib="dom" />
/**
 * Shared types and helpers for domain workload registers.
 * Chart fixtures live in `../workload-specs.ts`.
 */

export interface Workload {
  /** Stable identifier for bench-results.json / budgets.json (M3 gating). */
  id: string;
  /** mitata group label (kept byte-identical to the pre-M3 suite). */
  group: string;
  /** mitata bench label (kept byte-identical to the pre-M3 suite). */
  bench: string;
  fn: () => unknown;
}

/**
 * Stub CanvasRenderingContext2D: measures the CANVAS COMMAND-GENERATION cost
 * of the batch renderers (JS-side), not rasterization — bun has no canvas.
 * Real paint cost is browser-side (component tests exercise it).
 */
export function stubContext(): CanvasRenderingContext2D {
  const noop = (): void => {
    /* raster cost lives in the browser; this stub measures JS command cost */
  };
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineJoin: "round",
    lineCap: "round",
    globalAlpha: 1,
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    rect: noop,
    clip: noop,
    translate: noop,
    clearRect: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    strokeRect: noop,
    setTransform: noop,
  } as unknown as CanvasRenderingContext2D;
}

/** "1000" -> "1k"; sub-1k counts (smoke loess) stay plain. */
export function fmtK(n: number): string {
  return n >= 1000 ? `${n / 1000}k` : `${n}`;
}

export const opts = { width: 800, height: 500, maxMarks: 200_000 };
