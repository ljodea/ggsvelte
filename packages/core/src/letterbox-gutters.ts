/**
 * Fixed-aspect letterbox gutters: the unused allocation outside the fitted
 * data rectangle (ADR 0020). Renderers paint these with `theme.letterboxFill`
 * and must not cover the panel interior so transparent/`panel: "none"` charts
 * keep letterbox styling on gutters only.
 * Public via `letterboxGutterRects` for Core SVG and Svelte parity.
 */

export interface LetterboxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Return non-empty gutter rects for a fitted panel inside its pre-fit allocation. */
export function letterboxGutterRects(
  allocation: LetterboxRect,
  panel: LetterboxRect,
): LetterboxRect[] {
  const rects: LetterboxRect[] = [];
  const top = panel.y - allocation.y;
  if (top > 0) {
    rects.push({
      x: allocation.x,
      y: allocation.y,
      width: allocation.width,
      height: top,
    });
  }
  const bottom = allocation.y + allocation.height - (panel.y + panel.height);
  if (bottom > 0) {
    rects.push({
      x: allocation.x,
      y: panel.y + panel.height,
      width: allocation.width,
      height: bottom,
    });
  }
  const left = panel.x - allocation.x;
  if (left > 0) {
    rects.push({
      x: allocation.x,
      y: panel.y,
      width: left,
      height: panel.height,
    });
  }
  const right = allocation.x + allocation.width - (panel.x + panel.width);
  if (right > 0) {
    rects.push({
      x: panel.x + panel.width,
      y: panel.y,
      width: right,
      height: panel.height,
    });
  }
  return rects;
}
