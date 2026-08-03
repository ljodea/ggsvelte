/**
 * Capacity-matched bar charts for /palettes specimens.
 *
 * Every categorical palette has a fixed length (2–24). The specimen used to
 * always plot the 8 non-zero Armada tonnage squadrons, so short palettes
 * cycled and long palettes left most swatches unused. Specimens now pick a
 * real HistData series with exactly `capacity` categories so each colour
 * appears once.
 *
 * Sources (see NOTICE):
 * - 2–3: PolioTrials (Francis 1955)
 * - 4–10: Armada squadron men (Medina Sidonia muster)
 * - 11–12: Langren1644 longitude estimates
 * - 13–16: ChestSizes (Quetelet / EMSJ 1817)
 * - 17–24: Cholera 1848–49 district death rates (Farr)
 */

export type PaletteBarRow = {
  readonly category: string;
  readonly value: number;
};

export type PaletteSpecimenChart = {
  readonly rows: readonly PaletteBarRow[];
  readonly title: string;
  readonly x: string;
  readonly y: string;
  /** Flip when many category labels would collide on a band axis. */
  readonly flip: boolean;
  /** Plot height tuned for bar count (horizontal charts need more). */
  readonly height: number;
};

/** Polio trial paralytic cases per 100,000 — 3 arms. */
const POLIO: readonly PaletteBarRow[] = [
  { category: "Vaccinated", value: 16.4 },
  { category: "Placebo", value: 57.1 },
  { category: "Not inoculated", value: 35.7 },
];

/**
 * Armada 1588 squadron complements (soldiers + sailors), largest first.
 * 10 squadrons — HistData::Armada.
 */
const ARMADA_MEN: readonly PaletteBarRow[] = [
  { category: "Portugal", value: 4623 },
  { category: "Castile", value: 4171 },
  { category: "Hulks", value: 3729 },
  { category: "Levant", value: 3523 },
  { category: "Andalusia", value: 3105 },
  { category: "Biscay", value: 2800 },
  { category: "Guipúzcoa", value: 2608 },
  { category: "Naples", value: 1341 },
  { category: "Pataches", value: 1093 },
  { category: "Galleys", value: 362 },
];

/** Van Langren's 12 Toledo–Rome longitude estimates (degrees). */
const LANGREN: readonly PaletteBarRow[] = [
  { category: "G. Jansonius", value: 17.736 },
  { category: "G. Mercator", value: 19.872 },
  { category: "I. Schonerus", value: 20.638 },
  { category: "P. Lantsbergius", value: 21.106 },
  { category: "T. Brahe", value: 21.447 },
  { category: "I. Regiomontanus", value: 25.617 },
  { category: "Orontius", value: 26 },
  { category: "C. Clavius", value: 26.34 },
  { category: "C. Ptolomeus", value: 27.787 },
  { category: "A. Argelius", value: 28.17 },
  { category: "A. Maginus", value: 29.787 },
  { category: "D. Origanus", value: 30.128 },
];

/** Chest circumference (inches) counts — 16 bins. */
const CHEST: readonly PaletteBarRow[] = [
  { category: "33 in", value: 3 },
  { category: "34 in", value: 18 },
  { category: "35 in", value: 81 },
  { category: "36 in", value: 185 },
  { category: "37 in", value: 420 },
  { category: "38 in", value: 749 },
  { category: "39 in", value: 1073 },
  { category: "40 in", value: 1079 },
  { category: "41 in", value: 934 },
  { category: "42 in", value: 658 },
  { category: "43 in", value: 370 },
  { category: "44 in", value: 92 },
  { category: "45 in", value: 50 },
  { category: "46 in", value: 21 },
  { category: "47 in", value: 4 },
  { category: "48 in", value: 1 },
];

/**
 * London cholera 1848–49 death rate per 10,000 by district, highest first.
 * Enough rows for the largest remaining categorical scheme (tableau_hue_circle = 19).
 */
const CHOLERA: readonly PaletteBarRow[] = [
  { category: "Rotherhithe", value: 205 },
  { category: "St Olave", value: 181 },
  { category: "Bermondsey", value: 164 },
  { category: "St George Southwark", value: 161 },
  { category: "St Saviour", value: 153 },
  { category: "Newington", value: 144 },
  { category: "Lambeth", value: 120 },
  { category: "Wandsworth", value: 100 },
  { category: "Camberwell", value: 97 },
  { category: "West London", value: 96 },
  { category: "Bethnal Green", value: 90 },
  { category: "Shoreditch", value: 76 },
  { category: "Greenwich", value: 75 },
  { category: "Poplar", value: 71 },
  { category: "Westminster", value: 68 },
  { category: "Whitechapel", value: 64 },
  { category: "St Giles", value: 53 },
  { category: "Stepney", value: 47 },
  { category: "Chelsea", value: 46 },
  { category: "East London", value: 45 },
  { category: "St George East", value: 42 },
  { category: "London City", value: 38 },
  { category: "St Martin-in-the-Fields", value: 37 },
  { category: "Strand", value: 35 },
];

const MAX_CAPACITY = CHOLERA.length;

function take(rows: readonly PaletteBarRow[], n: number): readonly PaletteBarRow[] {
  if (n > rows.length) {
    throw new Error(`palette specimen needs ${String(n)} rows; source has ${String(rows.length)}`);
  }
  return rows.slice(0, n);
}

function plotHeight(capacity: number, flip: boolean): number {
  if (!flip) return 340;
  // Horizontal bars: room for labels + one bar band per category.
  return Math.min(560, 160 + capacity * 16);
}

/**
 * Pick a chart with exactly `capacity` filled categories.
 * Capacity 1 is allowed (degenerate) but production palettes start at 2.
 */
export function paletteSpecimenChart(capacity: number): PaletteSpecimenChart {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_CAPACITY) {
    throw new Error(
      `paletteSpecimenChart capacity must be 1..${String(MAX_CAPACITY)}, got ${String(capacity)}`,
    );
  }

  if (capacity <= 3) {
    return {
      rows: take(POLIO, capacity),
      title: "Salk polio trial, paralytic cases per 100,000",
      x: "Arm",
      y: "Cases / 100k",
      flip: false,
      height: plotHeight(capacity, false),
    };
  }

  if (capacity <= 10) {
    return {
      rows: take(ARMADA_MEN, capacity),
      title: "Spanish Armada squadron men, 1588",
      x: "Squadron",
      y: "Men",
      flip: false,
      height: plotHeight(capacity, false),
    };
  }

  if (capacity <= 12) {
    const flip = capacity > 10;
    return {
      rows: take(LANGREN, capacity),
      title: "Langren's Toledo–Rome longitude estimates, 1644",
      x: "Estimator",
      y: "Degrees",
      flip,
      height: plotHeight(capacity, flip),
    };
  }

  if (capacity <= 16) {
    return {
      rows: take(CHEST, capacity),
      title: "Scottish militiamen chest sizes (Quetelet)",
      x: "Chest",
      y: "Soldiers",
      flip: true,
      height: plotHeight(capacity, true),
    };
  }

  return {
    rows: take(CHOLERA, capacity),
    title: "London cholera death rate by district, 1848–49",
    x: "District",
    y: "Deaths / 10k",
    flip: true,
    height: plotHeight(capacity, true),
  };
}
