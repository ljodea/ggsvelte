/**
 * TextMeasurer contract + the canonical deterministic measurer
 * (graduated from the M0a-3 spike, decision 0003).
 *
 * Per the plan's "Measurement contract": the pure metrics-table measurer is the
 * *canonical deterministic* measurer (CI, VR, SSR, agents); browser-canvas
 * measurement is *native mode* and documented as non-identical. Scene
 * equivalence claims apply per-measurer, never across measurers.
 *
 * KERNING IS IGNORED by design: the metrics-table measurer sums per-character
 * advance widths. Real text shaping applies kerning pairs (e.g. "To", "Av"),
 * so native canvas widths are usually slightly *narrower* than the table's
 * sum. The drift was quantified in the M0a-3 spike (max 1.55px, always in the
 * safe/wide direction) and is absorbed by margin quantization (see layout.ts).
 */

export interface TextMeasurer {
  /** Advance width of `text` in px when set at `fontSizePx` in the default font stack. */
  measureWidth(text: string, fontSizePx: number): number;
  /** Line box height (ascent + descent) in px at `fontSizePx`. */
  measureHeight(fontSizePx: number): number;
}

/**
 * Font stack the metrics table is generated against. The browser table
 * generator and the drift test must use exactly this string.
 * Helvetica/Arial are near metric-compatible, which keeps cross-platform
 * drift low until we self-host a pinned font (planned for VR anyway).
 */
export const DEFAULT_FONT_STACK = "Helvetica, Arial, sans-serif";

export interface MetricsTable {
  /** Font stack the table was measured against (must equal DEFAULT_FONT_STACK). */
  fontStack: string;
  /** Reference font size in px the advances were measured at. */
  refSize: number;
  /** fontBoundingBoxAscent at refSize. */
  ascent: number;
  /** fontBoundingBoxDescent at refSize. */
  descent: number;
  /** Advance used for characters not in the table (px at refSize). */
  defaultAdvance: number;
  /** Per-character advance widths in px at refSize. */
  advances: Record<string, number>;
}

/**
 * Canonical deterministic measurer: per-character advance table measured at a
 * reference size, scaled linearly to the requested size. Linear scaling is
 * exact for scalable outline fonts as long as the browser doesn't hint canvas
 * text (Chromium doesn't); residual error is quantified in the drift test.
 */
export class MetricsTableMeasurer implements TextMeasurer {
  constructor(private readonly table: MetricsTable) {}

  measureWidth(text: string, fontSizePx: number): number {
    const { advances, defaultAdvance, refSize } = this.table;
    let sum = 0;
    // Iterate by code point so astral chars count once (they fall back to defaultAdvance).
    for (const ch of text) {
      const adv = advances[ch];
      sum += adv ?? defaultAdvance;
    }
    return (sum * fontSizePx) / refSize;
  }

  measureHeight(fontSizePx: number): number {
    const { ascent, descent, refSize } = this.table;
    return ((ascent + descent) * fontSizePx) / refSize;
  }
}
