/**
 * Compact regular grid of a radial Gaussian peak so default bins (10) draw
 * nested isolines. Fixed decimals only — values must be host-stable.
 */
export const peakGrid: { x: number; y: number; z: number }[] = (() => {
  const rows: { x: number; y: number; z: number }[] = [];
  const n = 17;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 4 - 2;
      const y = (j / (n - 1)) * 4 - 2;
      // Round to 4 decimals so the PortableSpec seed is stable.
      const xr = Math.round(x * 1000) / 1000;
      const yr = Math.round(y * 1000) / 1000;
      const z = Math.round(Math.exp(-(xr * xr + yr * yr)) * 10000) / 10000;
      rows.push({ x: xr, y: yr, z });
    }
  }
  return rows;
})();
