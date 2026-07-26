/**
 * Lissajous figure-eight (a=1, b=2) sampled in parametric order.
 *
 * x = sin(t), y = sin(2t) for t ∈ [0, 2π). x is non-monotonic, so
 * geom_line would re-order the vertices and destroy the loop;
 * geom_path keeps the parametric data order and draws the eight.
 *
 * Deterministic 64 samples — no RNG.
 */
export const lissajousEight: { t: number; x: number; y: number }[] = (() => {
  const n = 64;
  const rows: { t: number; x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    rows.push({ t, x: Math.sin(t), y: Math.sin(2 * t) });
  }
  return rows;
})();
