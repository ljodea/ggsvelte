/** Sample from a slightly right-skewed distribution for a Q–Q demo. */
export const heights: { height: number }[] = (() => {
  const rows: { height: number }[] = [];
  let s = 7;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = 0; i < 80; i++) {
    // Box–Muller + slight skew
    const u1 = Math.max(1e-9, rnd());
    const u2 = rnd();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    rows.push({ height: 170 + z * 8 + Math.max(0, z) * 1.5 });
  }
  return rows;
})();
