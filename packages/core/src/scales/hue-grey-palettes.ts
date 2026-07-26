/**
 * Fixed-length discrete palettes for scheme "hue" / "grey" (#829).
 *
 * Clean-room HCL/grey math from public CIE formulas — not ggplot2 R source.
 * Fixed length (10) matches other categorical schemes so grow-mode assignment
 * stays value-stable (decision 0002). ggplot2 re-samples n hues per train;
 * ggsvelte documents that divergence and cycles past 10 like observable10.
 *
 * Defaults (documented ggplot2 mental model):
 *   hue: HCL h ∈ [15°, 375°), c = 100, l = 65
 *   grey: relative luminance start=0.2 → end=0.8
 */

export const HUE_DEFAULT_H: readonly [number, number] = [15, 375];
export const HUE_DEFAULT_C = 100;
export const HUE_DEFAULT_L = 65;
export const GREY_DEFAULT_START = 0.2;
export const GREY_DEFAULT_END = 0.8;
export const HUE_GREY_PALETTE_SIZE = 10;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function toHexByte(n: number): string {
  return Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, "0");
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

function linearToSrgb(u: number): number {
  const v = clamp01(u);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}

/** CIE L*c*h* (cylindrical Lab) → sRGB hex. D65 white point. */
export function hclToHex(h: number, c: number, l: number): string {
  const hr = ((h % 360) * Math.PI) / 180;
  const a = Math.cos(hr) * c;
  const b = Math.sin(hr) * c;
  const y = (l + 16) / 116;
  const x = a / 500 + y;
  const z = y - b / 200;
  const x3 = x ** 3;
  const y3 = y ** 3;
  const z3 = z ** 3;
  const xr = x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787;
  const yr = y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787;
  const zr = z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787;
  const X = xr * 0.95047;
  const Y = yr * 1.0;
  const Z = zr * 1.08883;
  const rLin = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  const gLin = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  const bLin = X * 0.0557 + Y * -0.204 + Z * 1.057;
  return rgbToHex(linearToSrgb(rLin) * 255, linearToSrgb(gLin) * 255, linearToSrgb(bLin) * 255);
}

/** k evenly spaced HCL hues (k = domain size when materialising a range). */
export function huePalette(
  k: number,
  h: readonly [number, number] = HUE_DEFAULT_H,
  c: number = HUE_DEFAULT_C,
  l: number = HUE_DEFAULT_L,
): string[] {
  if (k <= 0) return [];
  const [h0, h1] = h;
  const span = h1 - h0;
  if (k === 1) return [hclToHex(h0 + span / 2, c, l)];
  // ggplot2 spaces across the wheel without double-counting the wrap.
  return Array.from({ length: k }, (_, i) => hclToHex(h0 + (span * i) / k, c, l));
}

/** k greys from start→end relative luminance in [0, 1]. */
export function greyPalette(
  k: number,
  start: number = GREY_DEFAULT_START,
  end: number = GREY_DEFAULT_END,
): string[] {
  if (k <= 0) return [];
  if (k === 1) {
    const g = Math.round(clamp01((start + end) / 2) * 255);
    return [rgbToHex(g, g, g)];
  }
  return Array.from({ length: k }, (_, i) => {
    const t = i / (k - 1);
    const g = Math.round(clamp01(start + (end - start) * t) * 255);
    return rgbToHex(g, g, g);
  });
}

/** Built-in 10-stop hue palette (scheme: "hue"). */
export const HUE_PALETTE_10: readonly string[] = Object.freeze(huePalette(HUE_GREY_PALETTE_SIZE));

/** Built-in 10-stop grey palette (scheme: "grey"). */
export const GREY_PALETTE_10: readonly string[] = Object.freeze(greyPalette(HUE_GREY_PALETTE_SIZE));
