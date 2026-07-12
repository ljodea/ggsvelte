/**
 * M0a-3 spike — native canvas text measurement helpers (browser only).
 * This is the "native mode" measurer side of the measurement contract.
 */

let ctx: CanvasRenderingContext2D | null = null;

function getCtx(): CanvasRenderingContext2D {
  if (!ctx) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('no 2d context');
    ctx = c;
  }
  return ctx;
}

/** measureText width with the browser's full shaping pipeline (kerning ON — the default). */
export function canvasMeasureWidth(text: string, fontSizePx: number, fontStack: string): number {
  const c = getCtx();
  c.font = `${fontSizePx}px ${fontStack}`;
  return c.measureText(text).width;
}

export interface FontBox {
  ascent: number;
  descent: number;
}

export function canvasFontBox(fontSizePx: number, fontStack: string): FontBox {
  const c = getCtx();
  c.font = `${fontSizePx}px ${fontStack}`;
  const m = c.measureText('Mg');
  return { ascent: m.fontBoundingBoxAscent, descent: m.fontBoundingBoxDescent };
}

/**
 * Characters the metrics table covers: printable ASCII 32-126, the printable
 * Latin-1 supplement 0xA0-0xFF (accented letters, currency, degree, plus-minus,
 * micro, multiplication), plus common typographic glyphs that show up in tick
 * labels (dashes, curly quotes, ellipsis, true minus sign, thin space,
 * less/greater-or-equal, euro). Anything else falls back to
 * MetricsTable.defaultAdvance.
 */
export const TABLE_CHARS: string[] = (() => {
  const chars = new Set<string>();
  for (let i = 32; i <= 126; i++) chars.add(String.fromCharCode(i));
  for (let i = 0xa0; i <= 0xff; i++) chars.add(String.fromCharCode(i));
  for (const ch of [
    '\u2009', // thin space
    '\u2013', // en dash
    '\u2014', // em dash
    '\u2018', '\u2019', '\u201C', '\u201D', // curly quotes
    '\u2026', // ellipsis
    '\u2212', // minus sign
    '\u2264', '\u2265', // <= >=
    '\u20AC', // euro
  ]) {
    chars.add(ch);
  }
  return [...chars];
})();

/**
 * Generate a metrics table by measuring each covered character individually
 * at `refSize`. defaultAdvance (fallback for unknown chars) is the width of
 * '0' — a safe, slightly-wide guess for label-ish text.
 */
export function generateMetricsTable(fontStack: string, refSize: number) {
  const advances: Record<string, number> = {};
  for (const ch of TABLE_CHARS) {
    advances[ch] = canvasMeasureWidth(ch, refSize, fontStack);
  }
  const box = canvasFontBox(refSize, fontStack);
  return {
    fontStack,
    refSize,
    ascent: box.ascent,
    descent: box.descent,
    defaultAdvance: advances['0'],
    advances,
  };
}
