/**
 * Hue / grey discrete palettes for scale_*_hue and scale_*_grey (#829).
 * Clean-room HSL greys and even-hue stops (not ggplot2 R source).
 */

/** HSL → #rrggbb (s,l in 0–1; h in degrees). */
export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) {
    r = c;
    g = x;
  } else if (hh < 120) {
    r = x;
    g = c;
  } else if (hh < 180) {
    g = c;
    b = x;
  } else if (hh < 240) {
    g = x;
    b = c;
  } else if (hh < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const to2 = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/** n even hues over [h0, h1); c/l are ggplot2-like 0–100 scales. */
export function buildHuePalette(
  n: number,
  h: readonly [number, number] = [15, 375],
  c = 100,
  l = 65,
): string[] {
  const count = Math.max(1, Math.floor(n));
  const s = Math.min(1, Math.max(0, c / 100));
  const light = Math.min(1, Math.max(0, l / 100));
  const [h0, h1] = h;
  const span = h1 - h0;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / count;
    out.push(hslToHex(h0 + span * t, s, light));
  }
  return out;
}

/** n greys from start→end in [0, 1]. */
export function buildGreyPalette(n: number, start = 0.2, end = 0.8): string[] {
  const count = Math.max(1, Math.floor(n));
  const s0 = Math.min(1, Math.max(0, start));
  const s1 = Math.min(1, Math.max(0, end));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const g = s0 + (s1 - s0) * t;
    const ch = Math.round(g * 255)
      .toString(16)
      .padStart(2, "0");
    out.push(`#${ch}${ch}${ch}`);
  }
  return out;
}

/** Default 10-stop hue scheme (matches scale_*_hue with no overrides). */
export const HUE_PALETTE_10: readonly string[] = Object.freeze(buildHuePalette(10));

/** Default 10-stop grey scheme (start 0.2, end 0.8). */
export const GREY_PALETTE_10: readonly string[] = Object.freeze(buildGreyPalette(10));
