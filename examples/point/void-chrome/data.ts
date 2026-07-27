/**
 * Compact scatter used to showcase theme_void: marks only, no cartesian chrome.
 * Synthetic positions (seeded) so the gallery preview is stable for VR.
 */
import { mulberry32 } from "../../rng.js";

const rng = mulberry32(822);

export const voidScatter: { x: number; y: number; group: string }[] = Array.from(
  { length: 48 },
  () => {
    const group = rng() < 0.5 ? "A" : "B";
    const cx = group === "A" ? 0.35 : 0.65;
    const cy = group === "A" ? 0.4 : 0.6;
    return {
      x: cx + (rng() - 0.5) * 0.35,
      y: cy + (rng() - 0.5) * 0.35,
      group,
    };
  },
);
