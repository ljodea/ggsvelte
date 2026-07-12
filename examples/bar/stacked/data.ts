/**
 * One row per support ticket (the bar geom COUNTS rows — ggplot2's geom_bar).
 * Seeded so the corpus is byte-reproducible.
 */
import { mulberry32 } from "../../rng.js";

const random = mulberry32(42);
const days = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const channels = ["email", "chat", "phone"] as const;
// Chat share grows through the week; phone stays a slim slice.
const chatShare = [0.25, 0.3, 0.35, 0.45, 0.55];
const volume = [28, 24, 26, 30, 34];

export const tickets: { day: string; channel: string }[] = [];
days.forEach((day, i) => {
  for (let n = 0; n < volume[i]!; n += 1) {
    const r = random();
    const channel = r < chatShare[i]! ? channels[1] : r < 0.85 ? channels[0] : channels[2];
    tickets.push({ day, channel });
  }
});
