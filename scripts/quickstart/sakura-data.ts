/**
 * Getting-started lesson data — the two lesson-only tables and the layout
 * constants the steps and the fold both derive from.
 *
 * Pure data — no step text here (see `./source-constants.ts` and
 * `./steps-*.ts`) and no fold (`./fold.ts`).
 */

export const QUICKSTART_PAGE_FILENAME = "src/routes/+page.svelte";

/**
 * Window (years) of the rolling-median trend line — the reference chart's
 * "30-year running median".
 */
export const SAKURA_TREND_WINDOW = 30;

/** Median bloom day 1600–1850, drawn as the pre-industrial baseline. */
export const SAKURA_BASELINE = "04-15";

/** Y-axis tick positions: three month-days, matching the reference chart. */
export const SAKURA_Y_BREAKS = ["04-05", "04-15", "04-25"] as const;

/** Y-axis title: the quantity (a date). Reverse scale puts earlier blooms higher. */
export const SAKURA_Y_LAB = "Bloom date (earlier ↑)";

/**
 * Plot domain top (earlier / higher on the reversed date axis). Leaves a
 * strip above the epoch bands so names sit above the pale fills, matching
 * the reference chart — not painted on the fill.
 */
export const DOMAIN_TOP = "03-10";
/** Plot domain bottom (later / lower on the reversed date axis). */
export const DOMAIN_BOTTOM = "05-10";
/**
 * Epoch bands cover every observation (earliest bloom is 25 March) without
 * filling the name strip above. Do not shrink this later than the earliest
 * data point — the rect must still encompass all points.
 */
const BAND_TOP = "03-18";
const BAND_BOTTOM = DOMAIN_BOTTOM;
/** Epoch names sit in the domain strip above the band top (earlier than BAND_TOP). */
const EPOCH_NAME_DATE = "03-14";

// --- the two lesson-only tables -------------------------------------------
// Both are small enough to read at a glance, and both are drawn by layers that
// carry their own `data` — the reason they exist as source in the lesson.

// `year` is the band's first year, so the plot's `key="year"` resolves on
// these rows too — every table the chart draws from speaks the same identity.
// Bounds follow the climate periods on the reference chart, not the first and
// last observation years: MWP starts after 812, and a gap separates MWP from LIA.
export const SAKURA_EPOCHS = [
  { epoch: "Medieval warm period", year: 950, until: 1250 },
  { epoch: "Little Ice Age", year: 1300, until: 1850 },
  { epoch: "Industrial era", year: 1850, until: 2026 },
].map((band) => ({ ...band, top: BAND_TOP, bottom: BAND_BOTTOM }));

/**
 * Where each epoch name sits: centred over its own band, near the top of the
 * pale fill. Derived from SAKURA_EPOCHS so a name can never drift off its band.
 */
export const SAKURA_EPOCH_NAMES = SAKURA_EPOCHS.map((band) => ({
  epoch: band.epoch,
  midYear: Math.round((band.year + band.until) / 2),
  nameDate: EPOCH_NAME_DATE,
}));

/**
 * The three records the chart calls out.
 *
 * Each label states the date as well as the claim: a callout that says a year
 * was a record without saying what the record was makes the reader hunt for
 * the value the annotation exists to deliver. Middle dot, not em dash — the
 * label is two facts side by side, not an aside.
 *
 * `labelYear`/`labelDate` are hand-placed adjacent to each point (short
 * leaders; the reference chart never runs a leader across the data), and each
 * sits on the opposite side of its point from the leader's travel, so no
 * leader crosses its own text. They have to be hand-placed because there is
 * no text repel (#727 gap B), so these are positions computed against a
 * layout nobody can see. Moving the domain or the panel size can invalidate
 * them.
 */
export const SAKURA_RECORDS = [
  {
    year: 1323,
    bloomDate: "05-04",
    label: "1323 · May 4, latest on record",
    labelYear: 1305,
    labelDate: "05-07",
  },
  {
    year: 1409,
    bloomDate: "03-27",
    label: "1409 · March 27, earliest for six centuries",
    labelYear: 1400,
    labelDate: "03-22",
  },
  {
    year: 2023,
    bloomDate: "03-25",
    label: "2023 · March 25, earliest in 1,200 years",
    labelYear: 2014,
    labelDate: "03-20",
  },
];

const recordRow = (year: number) => {
  const record = SAKURA_RECORDS.find((r) => r.year === year);
  if (!record) throw new Error(`SAKURA_RECORDS lost ${year}`);
  return { year: record.year, bloomDate: record.bloomDate };
};

/**
 * Ring treatment from the reference chart: an open blue ring on the latest
 * bloom on record, an open red ring on the earliest for six centuries, and a
 * filled red dot on the modern record. Derived from {@link SAKURA_RECORDS} so
 * a ring can never drift from the point it circles.
 */
export const SAKURA_RING_LATEST = [recordRow(1323)];
export const SAKURA_RING_EARLIEST = [recordRow(1409)];
export const SAKURA_RECORD_RECENT = [recordRow(2023)];

/**
 * The baseline's in-panel tag: the reference's single word "median", below
 * the rule at the left edge (the reference tags below the rule too, in the
 * margin our panels clip). Measured against the rendered scene (gate G8):
 * the box touches no trend vertex and exactly one faint bloom — the 891
 * observation — at any wide width; every other candidate pocket sits on
 * more data. The full phrase lives in the page footnote, like the
 * reference's caption.
 */
export const SAKURA_BASELINE_LABEL = [{ year: 812, bloomDate: SAKURA_BASELINE, label: "median" }];
