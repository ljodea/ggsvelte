/**
 * Clip y = intercept + slope · x to an axis-aligned rectangle in data space.
 * Returns two endpoints or null when the line misses the panel.
 */
export function clipAblineToRect(
  slope: number,
  intercept: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): readonly [number, number, number, number] | null {
  if (
    ![slope, intercept, xMin, xMax, yMin, yMax].every((v) => Number.isFinite(v)) ||
    xMin === xMax ||
    yMin === yMax
  ) {
    return null;
  }
  const loX = Math.min(xMin, xMax);
  const hiX = Math.max(xMin, xMax);
  const loY = Math.min(yMin, yMax);
  const hiY = Math.max(yMin, yMax);

  type Pt = { x: number; y: number };
  const pts: Pt[] = [];
  const push = (x: number, y: number) => {
    const epsX = (hiX - loX) * 1e-9;
    const epsY = (hiY - loY) * 1e-9;
    if (x + epsX < loX || x - epsX > hiX || y + epsY < loY || y - epsY > hiY) return;
    if (pts.some((p) => Math.abs(p.x - x) <= epsX && Math.abs(p.y - y) <= epsY)) return;
    pts.push({ x, y });
  };

  // Intersect with vertical edges x = loX / hiX.
  for (const x of [loX, hiX]) {
    push(x, intercept + slope * x);
  }
  // Intersect with horizontal edges y = loY / hiY (if slope finite and non-zero for x solve).
  if (Math.abs(slope) > 1e-15) {
    for (const y of [loY, hiY]) {
      push((y - intercept) / slope, y);
    }
  } else {
    // Horizontal line y = intercept.
    if (intercept >= loY - 1e-12 && intercept <= hiY + 1e-12) {
      push(loX, intercept);
      push(hiX, intercept);
    }
  }

  if (pts.length < 2) return null;
  // Order by x (then y) so the segment is stable.
  pts.sort((a, b) => a.x - b.x || a.y - b.y);
  const a = pts[0]!;
  const b = pts[pts.length - 1]!;
  if (a.x === b.x && a.y === b.y) return null;
  return [a.x, a.y, b.x, b.y];
}
