/**
 * Eight equal rays from the origin. A dense hillside vector field collapses
 * into a grey disk at the 96×96 geoms-index crop; eight long thick spokes
 * keep direction and length readable.
 */
const N = 8;
const RADIUS = 4;

export const rays: { x: number; y: number; angle: number; radius: number }[] = Array.from(
  { length: N },
  (_, i) => ({
    x: 0,
    y: 0,
    angle: (i * 2 * Math.PI) / N,
    radius: RADIUS,
  }),
);
