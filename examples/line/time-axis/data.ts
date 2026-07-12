/**
 * Daily active users over Q1 2026 — a seeded random walk with a weekly
 * rhythm (weekend dips), rounded to whole users. Dates are ISO strings
 * (temporal fields travel as ISO 8601 per the PortableSpec contract).
 */
import { mulberry32 } from "../../rng.js";

const random = mulberry32(20260101);
const DAY_MS = 86_400_000;
const start = Date.UTC(2026, 0, 1);

export const traffic: { date: string; users: number }[] = [];
let level = 1200;
for (let i = 0; i < 90; i += 1) {
  const t = start + i * DAY_MS;
  const weekday = new Date(t).getUTCDay();
  const weekend = weekday === 0 || weekday === 6 ? 0.72 : 1;
  level += (random() - 0.42) * 60; // gentle upward drift
  const date = new Date(t).toISOString().slice(0, 10);
  traffic.push({ date, users: Math.round(level * weekend) });
}
