/**
 * M0a-3 spike — browser half: metrics-table generation + drift quantification.
 *
 * 1. Generates the per-character advance table with canvas measureText and
 *    prints it (copy into spikes/pure/src/font-metrics.ts — workflow in that file).
 * 2. Asserts the checked-in table matches a fresh measurement (staleness guard).
 * 3. Measures a corpus of realistic tick labels with canvas measureText and
 *    compares against MetricsTableMeasurer at 10–14px; reports max/mean drift
 *    and whether 4px margin quantization absorbs it.
 */
import { describe, expect, it } from 'vitest';
import {
  canvasFontBox,
  canvasMeasureWidth,
  generateMetricsTable,
  TABLE_CHARS,
} from '../../src/canvas-text';
import {
  DEFAULT_FONT_STACK,
  MetricsTableMeasurer,
} from '../../../pure/src/measure';
import { FONT_METRICS } from '../../../pure/src/font-metrics';

const REF_SIZE = 100;

describe('metrics table generation', () => {
  it('generates the metrics table (copy output into pure/src/font-metrics.ts)', () => {
    const table = generateMetricsTable(DEFAULT_FONT_STACK, REF_SIZE);
    // Sanity: every covered char has a non-negative advance; ASCII printables
    // are strictly positive. (Soft hyphen U+00AD legitimately measures 0.)
    for (const ch of TABLE_CHARS) {
      const code = ch.codePointAt(0) as number;
      const min = code >= 32 && code <= 126 ? Number.MIN_VALUE : 0;
      expect(table.advances[ch], `advance of ${JSON.stringify(ch)}`).toBeGreaterThanOrEqual(min);
    }
    expect(table.ascent).toBeGreaterThan(0);
    expect(table.descent).toBeGreaterThan(0);
    console.log(`__METRICS_TABLE_START__${JSON.stringify(table)}__METRICS_TABLE_END__`);
  });

  it('checked-in table matches a fresh measurement (staleness guard)', () => {
    const fresh = generateMetricsTable(DEFAULT_FONT_STACK, REF_SIZE);
    expect(FONT_METRICS.fontStack).toBe(DEFAULT_FONT_STACK);
    expect(FONT_METRICS.refSize).toBe(REF_SIZE);
    expect(Math.abs(FONT_METRICS.ascent - fresh.ascent)).toBeLessThan(0.05);
    expect(Math.abs(FONT_METRICS.descent - fresh.descent)).toBeLessThan(0.05);
    for (const ch of TABLE_CHARS) {
      const checked = FONT_METRICS.advances[ch];
      expect(checked, `missing advance for ${JSON.stringify(ch)}`).toBeDefined();
      expect(
        Math.abs((checked as number) - fresh.advances[ch]),
        `advance drift for ${JSON.stringify(ch)}`,
      ).toBeLessThan(0.05);
    }
  });
});

/** Realistic tick-label corpus: numbers, dates, category names. */
const CORPUS: string[] = [
  // numbers (incl. grouped, decimals, negatives, exponents, huge)
  '0', '5', '10', '42', '100', '250', '1,000', '12,500', '1,234,567',
  '1,000,000,000,000,000', '0.5', '0.25', '3.14159', '0.00042',
  '-12.5', '−12.5', '1.2e+15', '2.5e-7', '1.5×10^-7', '50%', '99.9%',
  '$1,200', '€4,000', '£999', '¥10,000', '±0.05',
  // dates / times
  'Jan', 'Feb 2026', 'Mar 15', '2026-07-10', 'Jul 10, 2026', 'Q3 2025',
  'Wed 14', '12:30 PM', '09:00', '1970', '2026', 'Week 27', 'H1 2026',
  // category names
  'setosa', 'versicolor', 'virginica', 'North America', 'South-East Asia',
  'Widget-B', 'Other (misc)', 'Total revenue', 'Temperature (°C)',
  'CO2 emissions', 'A', 'BB', 'Uncategorized', 'iPhone 17 Pro Max',
  'Government & Public Sector', 'Energy — renewables', 'Übergröße',
  "O'Brien's Café", 'AVG WAIT TIME', 'µm per second',
];

/**
 * Strings containing characters OUTSIDE the table (Greek, sub/superscripts) —
 * these hit the defaultAdvance fallback. Reported, not gated: fallback drift
 * is expected and documented.
 */
const FALLBACK_CORPUS: string[] = ['μ ± 2σ', 'CO₂', '10⁻⁷', 'ΔT (°C)'];

const SIZES = [10, 11, 12, 13, 14];

/** Margin quantization step under evaluation (px). */
const QUANTUM = 4;
const quantize = (px: number) => Math.ceil(px / QUANTUM) * QUANTUM;

describe('drift: MetricsTableMeasurer vs canvas measureText', () => {
  const measurer = new MetricsTableMeasurer(FONT_METRICS);

  it('stays under tolerance across the corpus at 10-14px', () => {
    let maxDrift = 0;
    let maxDriftCase = '';
    let maxUnder = 0; // native wider than table = the UNSAFE direction
    let sum = 0;
    let n = 0;
    let absorbed = 0;
    let quantumOff = 0;

    for (const size of SIZES) {
      for (const text of CORPUS) {
        const native = canvasMeasureWidth(text, size, DEFAULT_FONT_STACK);
        const table = measurer.measureWidth(text, size);
        const drift = Math.abs(native - table);
        sum += drift;
        n++;
        if (drift > maxDrift) {
          maxDrift = drift;
          maxDriftCase = `${JSON.stringify(text)} @ ${size}px (native ${native.toFixed(3)}, table ${table.toFixed(3)})`;
        }
        if (native - table > maxUnder) maxUnder = native - table;
        const qn = quantize(native);
        const qt = quantize(table);
        if (qn === qt) absorbed++;
        else if (Math.abs(qn - qt) <= QUANTUM) quantumOff++;
        else throw new Error(`quantized margins differ by >1 quantum for ${JSON.stringify(text)} @ ${size}px`);
      }
    }

    const mean = sum / n;
    console.log(
      `__DRIFT_REPORT__ n=${n} maxDrift=${maxDrift.toFixed(4)}px meanDrift=${mean.toFixed(4)}px ` +
        `maxUnder=${maxUnder.toFixed(4)}px worst=${maxDriftCase} ` +
        `quantAbsorbed=${absorbed}/${n} (${((100 * absorbed) / n).toFixed(1)}%) ` +
        `offByOneQuantum=${quantumOff}`,
    );

    // Tolerances determined empirically from this corpus (decision record
    // 0003): observed max 1.55px @14px ("Total revenue", kerning), mean
    // 0.075px, 99.3% absorbed by 4px quantization, never >1 quantum off.
    expect(maxDrift).toBeLessThan(2.0);
    expect(mean).toBeLessThan(0.25);
    // Kerning only ever TIGHTENS real text vs the table's per-char sum, so the
    // canonical measurer errs wide (margins slightly generous, labels never
    // clipped): native must not exceed the table by more than sub-pixel noise.
    expect(maxUnder).toBeLessThan(0.5);
    // 4px quantization: buckets never differ by more than one quantum, and
    // nearly all of the corpus lands in the same bucket.
    expect(absorbed / n).toBeGreaterThan(0.95);
  });

  it('reports fallback drift for characters outside the table (not gated)', () => {
    for (const size of SIZES) {
      for (const text of FALLBACK_CORPUS) {
        const native = canvasMeasureWidth(text, size, DEFAULT_FONT_STACK);
        const table = measurer.measureWidth(text, size);
        const drift = Math.abs(native - table);
        expect(Number.isFinite(drift)).toBe(true);
        console.log(
          `__FALLBACK_DRIFT__ ${JSON.stringify(text)} @ ${size}px drift=${drift.toFixed(3)}px`,
        );
      }
    }
  });

  it('height drift is negligible at 10-14px', () => {
    for (const size of SIZES) {
      const nativeBox = canvasFontBox(size, DEFAULT_FONT_STACK);
      const nativeHeight = nativeBox.ascent + nativeBox.descent;
      const tableHeight = measurer.measureHeight(size);
      expect(Math.abs(nativeHeight - tableHeight)).toBeLessThan(1.0);
    }
  });
});
