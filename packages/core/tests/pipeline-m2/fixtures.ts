/**
 * Shared fixtures for M2 statistical-layer pipeline characterization.
 */
import { mulberry32 } from "../../src/stats/numeric.ts";

export const size = { width: 640, height: 400 };

export function scatter(n: number, seed = 7): { x: number[]; y: number[]; g: string[] } {
  const rnd = mulberry32(seed);
  const x: number[] = [];
  const y: number[] = [];
  const g: string[] = [];
  for (let i = 0; i < n; i++) {
    const xv = rnd() * 10;
    x.push(xv);
    y.push(2 + 0.8 * xv + (rnd() - 0.5) * 2);
    g.push(i % 2 === 0 ? "a" : "b");
  }
  return { x, y, g };
}
