/** Synthetic standard-normal samples for the geom_function PDF overlay. */
export const samples: { x: number; y: number }[] = (() => {
  // Fixed hand sample near N(0,1) for a light scatter under the curve.
  const xs = [-2.1, -1.4, -0.8, -0.3, 0.1, 0.4, 0.9, 1.3, 1.8, 2.4];
  return xs.map((x) => ({ x, y: 0 }));
})();
