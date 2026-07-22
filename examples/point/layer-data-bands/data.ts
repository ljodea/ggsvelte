/** Large observation table plus small band and annotation tables (#589). */
import { mulberry32 } from "../../rng.js";

const rng = mulberry32(58901);

export const observations = Array.from({ length: 120 }, () => {
  const group = rng() < 0.5 ? "A" : "B";
  const base = group === "A" ? 40 : 60;
  return {
    x: 10 + rng() * 80,
    y: base + (rng() - 0.5) * 25,
    group,
  };
});

/** Background bands in x (small table, independent of observations). */
export const bands = [
  { xmin: 20, xmax: 35, ymin: 0, ymax: 100, region: "early" },
  { xmin: 55, xmax: 70, ymin: 0, ymax: 100, region: "late" },
] as const;

/** Single annotation point. */
export const callouts = [{ x: 45, y: 75, label: "threshold" }] as const;
