/**
 * Getting-started lesson data and step model.
 *
 * Epoch bands, record annotations, step types, and the SAKURA_STEPS deltas
 * (PortableSpec + Svelte source templates). Pure data — the fold that
 * accumulates steps lives in `./fold.ts`.
 */

import type { GuidesSpec, Labs, LayerSpec, Scales, ThemeName } from "@ggsvelte/spec";

export const QUICKSTART_PAGE_FILENAME = "src/routes/+page.svelte";

/** Bin width (years) for the running-median step line. */
export const SAKURA_BINWIDTH = 25;

/** Median bloom day 1600–1850, drawn as the pre-industrial baseline. */
export const SAKURA_BASELINE = "04-15";

/** Y-axis tick positions: three month-days, matching the reference chart. */
export const SAKURA_Y_BREAKS = ["04-05", "04-15", "04-25"] as const;

/** Y-axis title: the quantity (a date), with earlier up. */
export const SAKURA_Y_LAB = "Bloom date (earlier ↑)";

/**
 * Plot domain top (earlier / higher on the reversed date axis). Leaves a
 * strip above the epoch bands so names sit above the pale fills, matching
 * the reference chart — not painted on the fill.
 */
const DOMAIN_TOP = "03-10";
/** Plot domain bottom (later / lower on the reversed date axis). */
const DOMAIN_BOTTOM = "05-10";
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
const SAKURA_EPOCH_NAMES = SAKURA_EPOCHS.map((band) => ({
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
 * `labelYear`/`labelDate` are hand-placed, and each sits on the opposite side
 * of its point from the leader's travel, so no leader crosses its own text.
 * They have to be hand-placed because there is no text repel (#727 gap B), so
 * these are positions computed against a layout nobody can see. Moving the
 * domain or the panel size can invalidate them.
 */
export const SAKURA_RECORDS = [
  {
    year: 1323,
    bloomDate: "05-04",
    label: "1323 · May 4, latest on record",
    labelYear: 1250,
    labelDate: "05-08",
  },
  {
    year: 1409,
    bloomDate: "03-27",
    label: "1409 · March 27, earliest for six centuries",
    labelYear: 1310,
    labelDate: "03-24",
  },
  {
    year: 2023,
    bloomDate: "03-25",
    label: "2023 · March 25, earliest in 1,200 years",
    labelYear: 2010,
    labelDate: "03-24",
  },
];

// --- step model ------------------------------------------------------------

export interface SakuraSpecDelta {
  /** Layers keyed by name; a repeated key replaces that layer. */
  readonly layers?: Readonly<Record<string, LayerSpec>>;
  /** Full bottom-to-top z-order after this step. */
  readonly order?: readonly string[];
  readonly scales?: Scales;
  readonly guides?: GuidesSpec;
  readonly labs?: Labs;
  readonly theme?: ThemeName;
}

export interface SakuraSourceDelta {
  /** Components added to the `@ggsvelte/svelte` import. */
  readonly components?: readonly string[];
  /** Whole `const` blocks added to the module script. */
  readonly consts?: readonly string[];
  /** `<GGPlot>` attributes, keyed by attribute name; a repeat replaces it. */
  readonly attrs?: Readonly<Record<string, string>>;
  /**
   * Declaration-only grammar children (`<ScaleYMonthDay>`, `<Labs>`,
   * `<GuideLegend>`, `<ThemeTufte>`, …), keyed by the grammar piece they
   * carry; a repeat replaces it.
   *
   * Held apart from {@link children} because they are not layers: they never
   * appear in `childOrder`, and they are emitted ahead of every geom so that a
   * later step adding a geom cannot silently reorder them (#659 D2 — child
   * layers apply in registration order).
   */
  readonly grammar?: Readonly<Record<string, string>>;
  /** Child elements keyed by the layer they draw; a repeat replaces it. */
  readonly children?: Readonly<Record<string, string>>;
  /** Full bottom-to-top child order after this step. */
  readonly childOrder?: readonly string[];
}

export interface SakuraStep {
  readonly id: string;
  /** Step heading. States the reader's goal, not the mechanism. */
  readonly title: string;
  /**
   * Optional one-line note under the heading. Empty string = no note
   * (prefer no marketing prose on this page).
   */
  readonly outcome: string;
  /**
   * Optional grammar note under the fragment. Empty string = no note.
   */
  readonly explanation: string;
  /** The delta the reader types, as it appears above the chart. */
  readonly fragment: string;
  readonly spec: SakuraSpecDelta;
  readonly source: SakuraSourceDelta;
}

const EPOCHS_CONST = `  // Bands cover every observation; a strip above holds the epoch names.
  const span = { top: "${BAND_TOP}", bottom: "${BAND_BOTTOM}" };
  const epochs = [
${SAKURA_EPOCHS.map(
  (e) => `    { epoch: "${e.epoch}", year: ${e.year}, until: ${e.until}, ...span },`,
).join("\n")}
  ];`;

const RECORDS_CONST = `  const records = [
${SAKURA_RECORDS.map(
  (r) =>
    `    {\n      year: ${r.year}, bloomDate: "${r.bloomDate}",\n      labelYear: ${r.labelYear}, labelDate: "${r.labelDate}",\n      label: "${r.label}",\n    },`,
).join("\n")}
  ];`;

const EPOCH_NAMES_CONST = `  const epochNames = [
${SAKURA_EPOCH_NAMES.map(
  (n) => `    { epoch: "${n.epoch}", midYear: ${n.midYear}, nameDate: "${n.nameDate}" },`,
).join("\n")}
  ];`;

const EPOCH_DOMAIN = SAKURA_EPOCHS.map((e) => `"${e.epoch}"`).join(", ");
const EPOCH_VALUES = '"#f5edc4", "#dce8f2", "#f3dcda"';

export const SAKURA_STEPS: readonly SakuraStep[] = [
  {
    id: "separate-signal-from-noise",
    title: "Pick a minimal theme and add a rolling median line",
    outcome: "",
    explanation: "",
    // Theme early: gridless Tufte chrome with the trend step, so band edges
    // later never fight default gridlines.
    fragment: `<ThemeTufte />
<GeomPoint alpha={0.5} size={1.6}
  aes={{ color: { value: "#777777" } }} />
<GeomLine stat="summary_bin" fun="median" binwidth={${SAKURA_BINWIDTH}}
  curve="step-hv" linewidth={1.8}
  aes={{ color: { value: "#262626" } }} />`,
    spec: {
      theme: "tufte",
      layers: {
        points: {
          geom: "point",
          aes: { color: { value: "#777777" } },
          params: { alpha: 0.5, size: 1.6 },
        },
        trend: {
          geom: "line",
          stat: "summary_bin",
          aes: { color: { value: "#262626" } },
          params: {
            fun: "median",
            binwidth: SAKURA_BINWIDTH,
            curve: "step-hv",
            linewidth: 1.8,
          },
        },
      },
      order: ["points", "trend"],
    },
    source: {
      components: ["GeomLine", "ThemeTufte"],
      grammar: {
        theme: `  <ThemeTufte />`,
      },
      children: {
        points: `  <GeomPoint
    alpha={0.5}
    size={1.6}
    aes={{ color: { value: "#777777" } }}
  />`,
        trend: `  <GeomLine
    stat="summary_bin"
    fun="median"
    binwidth={${SAKURA_BINWIDTH}}
    curve="step-hv"
    linewidth={1.8}
    aes={{ color: { value: "#262626" } }}
  />`,
      },
      childOrder: ["points", "trend"],
    },
  },
  {
    id: "put-earlier-bloom-on-top",
    title: "Put earlier bloom on top",
    outcome: "",
    explanation: "",
    // X scale (labels + domain) already lives on the first render so year ticks
    // stay stable. This step only upgrades the reversed month-day y scale.
    fragment: `<ScaleYMonthDay
  reverse
  breaks={[${SAKURA_Y_BREAKS.map((d) => `"${d}"`).join(", ")}]}
  dateLabels="%b %e"
  domain={["${DOMAIN_BOTTOM}", "${DOMAIN_TOP}"]}
/>`,
    spec: {
      scales: {
        y: {
          type: "time",
          temporalKind: "monthDay",
          reverse: true,
          breaks: [...SAKURA_Y_BREAKS],
          dateLabels: "%b %e",
          domain: [DOMAIN_BOTTOM, DOMAIN_TOP],
        },
      },
      labs: { x: "Year", y: SAKURA_Y_LAB },
    },
    source: {
      components: ["ScaleYMonthDay"],
      grammar: {
        scaleY: `  <ScaleYMonthDay
    reverse
    breaks={[${SAKURA_Y_BREAKS.map((d) => `"${d}"`).join(", ")}]}
    dateLabels="%b %e"
    domain={["${DOMAIN_BOTTOM}", "${DOMAIN_TOP}"]}
  />`,
        labs: `  <Labs x="Year" y="${SAKURA_Y_LAB}" />`,
      },
    },
  },
  {
    id: "add-epoch-bands",
    title: "Add epoch bands",
    outcome: "",
    explanation: "",
    // inspect: false — bands are labelled decoration (#1068). A full-panel
    // rect reports distance 0 everywhere it is painted, so without the opt-out
    // nearest never reaches a bloom observation or the trend.
    fragment: `<GeomRect
  data={epochs}
  aes={{
    x: null, y: null,
    xmin: "year", xmax: "until", ymin: "top", ymax: "bottom",
    fill: "epoch",
  }}
  alpha={0.55}
  inspect={false}
/>
<GeomText data={epochNames}
  aes={{ x: "midYear", y: "nameDate", label: "epoch",
         color: { value: "#6b7075" } }} size={11} inspect={false} />
<ScaleFillManual
  domain={[${EPOCH_DOMAIN}]}
  values={[${EPOCH_VALUES}]}
/>
<GuideNone channel="fill" />`,
    spec: {
      layers: {
        epochs: {
          geom: "rect",
          data: { values: SAKURA_EPOCHS },
          aes: {
            x: null,
            y: null,
            xmin: { field: "year" },
            xmax: { field: "until" },
            ymin: { field: "top" },
            ymax: { field: "bottom" },
            fill: { field: "epoch" },
          },
          params: { alpha: 0.55 },
          inspect: false,
        },
        // Names the bands where the reader is already looking, instead of
        // sending them to a colour key at the foot of the plot.
        epochNames: {
          geom: "text",
          data: { values: SAKURA_EPOCH_NAMES },
          aes: {
            x: { field: "midYear" },
            y: { field: "nameDate" },
            label: { field: "epoch" },
            color: { value: "#6b7075" },
          },
          params: { size: 11 },
          // Decorations, like the bands they name (#1068).
          inspect: false,
        },
      },
      order: ["epochs", "epochNames", "points", "trend"],
      scales: {
        fill: {
          type: "manual",
          domain: SAKURA_EPOCHS.map((epoch) => epoch.epoch),
          range: ["#f5edc4", "#dce8f2", "#f3dcda"],
        },
      },
      // A mapped fill draws a legend by default, so the names above the bands
      // would be repeated in a key at the foot of the plot. Turning it off is
      // the point of drawing them there.
      guides: { fill: { type: "none" } },
    },
    source: {
      components: ["GeomRect", "GeomText", "ScaleFillManual", "GuideNone"],
      consts: [EPOCHS_CONST, EPOCH_NAMES_CONST],
      grammar: {
        scaleFill: `  <ScaleFillManual
    domain={[${EPOCH_DOMAIN}]}
    values={[${EPOCH_VALUES}]}
  />`,
        guides: `  <GuideNone channel="fill" />`,
      },
      children: {
        epochs: `  <GeomRect
    data={epochs}
    aes={{
      x: null,
      y: null,
      xmin: "year",
      xmax: "until",
      ymin: "top",
      ymax: "bottom",
      fill: "epoch",
    }}
    alpha={0.55}
    inspect={false}
  />`,
        epochNames: `  <GeomText
    data={epochNames}
    aes={{
      x: "midYear",
      y: "nameDate",
      label: "epoch",
      color: { value: "#6b7075" },
    }}
    size={11}
    inspect={false}
  />`,
      },
      childOrder: ["epochs", "epochNames", "points", "trend"],
    },
  },
  {
    id: "annotate-record-years",
    title: "Annotate record years",
    outcome: "",
    explanation: "",
    fragment: `<GeomRule yintercept="${SAKURA_BASELINE}" linewidth={1}
  aes={{ color: { value: "#6b7075" }, linetype: { value: "dashed" } }} />
<GeomSegment data={records}
  aes={{ x: "labelYear", y: "labelDate", xend: "year",
         yend: "bloomDate", color: { value: "#b3452f" } }} linewidth={0.7} />
<GeomText data={records}
  aes={{ x: "labelYear", y: "labelDate", label: "label",
         color: { value: "#b3452f" } }} size={11} anchor="end" dx={-4} />`,
    spec: {
      layers: {
        baseline: {
          geom: "rule",
          // A reference line nobody can see refers to nothing. Darker and
          // full strength; the caption says what it marks, because there is no
          // room inside the panel to say it there (#727).
          aes: { color: { value: "#6b7075" }, linetype: { value: "dashed" } },
          params: { yintercept: SAKURA_BASELINE, linewidth: 1 },
        },
        leaders: {
          geom: "segment",
          data: { values: SAKURA_RECORDS },
          aes: {
            x: { field: "labelYear" },
            y: { field: "labelDate" },
            xend: { field: "year" },
            yend: { field: "bloomDate" },
            color: { value: "#b3452f" },
          },
          params: { linewidth: 0.7, alpha: 0.9 },
        },
        callouts: {
          geom: "text",
          data: { values: SAKURA_RECORDS },
          aes: {
            x: { field: "labelYear" },
            y: { field: "labelDate" },
            label: { field: "label" },
            color: { value: "#b3452f" },
          },
          // Every label sits left of its point, so anchoring at the end puts
          // the text and the leader on opposite sides of the same coordinate
          // and no leader can run back through its own words.
          params: { size: 11, anchor: "end", dx: -4 },
        },
      },
      order: ["epochs", "epochNames", "points", "baseline", "trend", "leaders", "callouts"],
    },
    source: {
      components: ["GeomRule", "GeomSegment", "GeomText"],
      consts: [RECORDS_CONST],
      children: {
        baseline: `  <GeomRule
    yintercept="${SAKURA_BASELINE}"
    linewidth={1}
    aes={{ color: { value: "#6b7075" }, linetype: { value: "dashed" } }}
  />`,
        leaders: `  <GeomSegment
    data={records}
    aes={{
      x: "labelYear",
      y: "labelDate",
      xend: "year",
      yend: "bloomDate",
      color: { value: "#b3452f" },
    }}
    linewidth={0.7}
    alpha={0.9}
  />`,
        callouts: `  <GeomText
    data={records}
    aes={{
      x: "labelYear",
      y: "labelDate",
      label: "label",
      color: { value: "#b3452f" },
    }}
    size={11}
    anchor="end"
    dx={-4}
  />`,
      },
      childOrder: ["epochs", "epochNames", "points", "baseline", "trend", "leaders", "callouts"],
    },
  },
  {
    id: "finish-it",
    title: "Finish it",
    outcome: "",
    explanation: "",
    // No title/subtitle/caption: chrome would squash the data panel. Citation
    // and the dashed-rule note live as a page footnote instead.
    fragment: `key="year"
inspect={{ mode: "exact", pin: true }}`,
    spec: {},
    source: {
      attrs: {
        key: `  key="year"`,
        inspect: `  inspect={{ mode: "exact", pin: true }}`,
      },
    },
  },
];
