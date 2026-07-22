/// <reference lib="dom" />
/**
 * DOM-facing canvas helpers (decision 0006): CSS color resolution, DPR sizing,
 * and panel clipping. Kept separate from mark drawers so theme/DPR recipes
 * can change without touching geometry paint paths.
 */

/** Resolve a scene color expression to a concrete canvas-usable color. */
export type ColorResolver = (color: string) => string;

const VAR_RE = /^var\((--[\w-]+)\s*,\s*(.+)\)$/;

/**
 * Build a resolver over an element's computed style: `var(--gg-*, fallback)`
 * reads the custom property (falling back to the embedded token), and
 * `currentColor` reads the computed `color`. Resolutions are cached; build
 * a fresh resolver per draw so theme flips re-resolve.
 */
export function cssColorResolver(el: Element): ColorResolver {
  const cache = new Map<string, string>();
  let computed: CSSStyleDeclaration | null = null;
  const style = () => (computed ??= getComputedStyle(el));
  return (color: string): string => {
    const cached = cache.get(color);
    if (cached !== undefined) return cached;
    let out = color;
    const match = VAR_RE.exec(out);
    if (match !== null) {
      const value = style().getPropertyValue(match[1]!).trim();
      out = value === "" ? match[2]! : value;
    }
    if (out === "currentColor") out = style().color;
    cache.set(color, out);
    return out;
  };
}

/**
 * Size a canvas for a device pixel ratio (decision 0006 recipe): rounded
 * integer backing store, pinned CSS box, absolute dpr transform.
 */
export function sizeCanvasForDpr(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): void {
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/**
 * Panel clipping recipe (decision 0006): save / beginPath / rect / clip /
 * draw / restore. beginPath is load-bearing — clip() uses the current path.
 */
export function drawClippedToPanel(
  ctx: CanvasRenderingContext2D,
  panel: { x: number; y: number; width: number; height: number; clip?: boolean },
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (panel.clip === false) {
    draw(ctx);
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.width, panel.height);
  ctx.clip();
  draw(ctx);
  ctx.restore();
}
