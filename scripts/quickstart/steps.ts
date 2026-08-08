/**
 * Getting-started lesson data and step model.
 *
 * Epoch bands, record annotations, step types, and the SAKURA_STEPS deltas
 * (PortableSpec + Svelte source templates). Pure data — the fold that
 * accumulates steps lives in `./fold.ts`.
 */

import type { GuidesSpec, Labs, LayerSpec, Scales, ThemeName } from "@ggsvelte/spec";

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
const SAKURA_RING_LATEST = [recordRow(1323)];
const SAKURA_RING_EARLIEST = [recordRow(1409)];
const SAKURA_RECORD_RECENT = [recordRow(2023)];

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
  /**
   * Register functions added to the `@ggsvelte/svelte` import and called in
   * the script body. A `stat="…"` override on a basic shell needs its family
   * registered — the shell registers only its default stat (#1420).
   */
  readonly registers?: readonly string[];
  /** Whole `const` blocks added to the module script. */
  readonly consts?: readonly string[];
  /** `<GGPlot>` attributes, keyed by attribute name; a repeat replaces it. */
  readonly attrs?: Readonly<Record<string, string>>;
  /**
   * Declaration-only **grammar layers** (`<ScaleYMonthDay>`, `<Labs>`,
   * `<GuideLegend>`, `<ThemeTufte>`, …), keyed by the grammar piece they
   * carry; a repeat replaces it.
   *
   * These **are** plot layers (`Layer.kind` scale/theme/coord/facet/labs/
   * guides/legend via `createPlotLayer`). They are held apart from
   * {@link children} only because they are **not mark layers**: they never
   * appear in `childOrder` (geom z-order). The lesson emits marks first, then
   * grammar, then Inspect — ggplot2 thinking order. Registration order still
   * drives mark z-order and last-wins folds within a grammar family (#659).
   *
   * Do not call them “non-layers.” PortableSpec puts marks in `layers[]` and
   * folds these families into top-level keys; that is serialization, not
   * ontology.
   */
  readonly grammar?: Readonly<Record<string, string>>;
  /** Mark/geom child elements keyed by the layer they draw; a repeat replaces it. */
  readonly children?: Readonly<Record<string, string>>;
  /** Full bottom-to-top mark child order after this step. */
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

/**
 * The baseline's in-panel tag: the reference's single word "median", below
 * the rule at the left edge (the reference tags below the rule too, in the
 * margin our panels clip). Measured against the rendered scene (gate G8):
 * the box touches no trend vertex and exactly one faint bloom — the 891
 * observation — at any wide width; every other candidate pocket sits on
 * more data. The full phrase lives in the page footnote, like the
 * reference's caption.
 */
const SAKURA_BASELINE_LABEL = [{ year: 812, bloomDate: SAKURA_BASELINE, label: "median" }];

const BASELINE_LABEL_CONST = `  const baselineLabel = [
    { year: 812, bloomDate: "${SAKURA_BASELINE}", label: "median" },
  ];`;

// Two-column rows only — same shape as SAKURA_RING_* / the fold spec — so a
// reader who copies the finished file does not get callout fields in ring
// tooltips that the live lesson chart never shows.
const RINGS_CONST = `  // Ring treatment from the reference: an open blue ring on the latest
  // bloom, an open red ring on the earliest, a filled red dot on the modern record.
  const ringLatest = [{ year: ${SAKURA_RING_LATEST[0]!.year}, bloomDate: "${SAKURA_RING_LATEST[0]!.bloomDate}" }];
  const ringEarliest = [{ year: ${SAKURA_RING_EARLIEST[0]!.year}, bloomDate: "${SAKURA_RING_EARLIEST[0]!.bloomDate}" }];
  const recordRecent = [{ year: ${SAKURA_RECORD_RECENT[0]!.year}, bloomDate: "${SAKURA_RECORD_RECENT[0]!.bloomDate}" }];`;

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
    // Theme + trend + y-tick polish in one step. Reverse already ships on the
    // first render (base fold); this only sets readable Apr day breaks, date
    // labels, and a domain strip for later epoch names — not a second reverse.
    // Dotted chartlines hang off the two outer breaks so each labeled date has
    // a line a reader can use, matching the reference chart.
    fragment: `<ThemeTufte />
<ScaleYMonthDay
  reverse
  breaks={[${SAKURA_Y_BREAKS.map((d) => `"${d}"`).join(", ")}]}
  dateLabels="%b %e"
  domain={["${DOMAIN_BOTTOM}", "${DOMAIN_TOP}"]}
/>
<GeomRule yintercept="${SAKURA_Y_BREAKS[0]}" linewidth={0.75}
  aes={{ color: { value: "#b7c1cd" }, linetype: { value: "dotted" } }}
  inspect={false} />
<GeomRule yintercept="${SAKURA_Y_BREAKS[2]}" linewidth={0.75}
  aes={{ color: { value: "#b7c1cd" }, linetype: { value: "dotted" } }}
  inspect={false} />
<GeomPoint alpha={0.55} size={1.4}
  aes={{ color: { value: "#4a5568" } }} />
<GeomLine stat="summary_rolling" fun="median" window={${SAKURA_TREND_WINDOW}}
  curve="linear" linewidth={1.8}
  aes={{ color: { value: "#262626" } }} />`,
    spec: {
      theme: "tufte",
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
      layers: {
        chartlineEarly: {
          geom: "rule",
          aes: { color: { value: "#b7c1cd" }, linetype: { value: "dotted" } },
          params: { yintercept: SAKURA_Y_BREAKS[0], linewidth: 0.75 },
          // Chrome duplicating an axis break; answers no tooltip (#1068).
          inspect: false,
        },
        chartlineLate: {
          geom: "rule",
          aes: { color: { value: "#b7c1cd" }, linetype: { value: "dotted" } },
          params: { yintercept: SAKURA_Y_BREAKS[2], linewidth: 0.75 },
          inspect: false,
        },
        points: {
          geom: "point",
          aes: { color: { value: "#4a5568" } },
          params: { alpha: 0.55, size: 1.4 },
        },
        trend: {
          geom: "line",
          stat: "summary_rolling",
          aes: { color: { value: "#262626" } },
          params: {
            fun: "median",
            window: SAKURA_TREND_WINDOW,
            curve: "linear",
            linewidth: 1.8,
          },
        },
      },
      order: ["chartlineEarly", "chartlineLate", "points", "trend"],
    },
    source: {
      components: ["GeomLine", "GeomRule", "ThemeTufte"],
      // stat="summary_rolling" on the basic GeomLine shell: opt into the family.
      registers: ["registerSummaryRolling"],
      grammar: {
        theme: `  <ThemeTufte />`,
        scaleY: `  <ScaleYMonthDay
    reverse
    breaks={[${SAKURA_Y_BREAKS.map((d) => `"${d}"`).join(", ")}]}
    dateLabels="%b %e"
    domain={["${DOMAIN_BOTTOM}", "${DOMAIN_TOP}"]}
  />`,
        labs: `  <Labs x="Year" y="${SAKURA_Y_LAB}" />`,
      },
      children: {
        chartlineEarly: `  <GeomRule
    yintercept="${SAKURA_Y_BREAKS[0]}"
    linewidth={0.75}
    aes={{ color: { value: "#b7c1cd" }, linetype: { value: "dotted" } }}
    inspect={false}
  />`,
        chartlineLate: `  <GeomRule
    yintercept="${SAKURA_Y_BREAKS[2]}"
    linewidth={0.75}
    aes={{ color: { value: "#b7c1cd" }, linetype: { value: "dotted" } }}
    inspect={false}
  />`,
        points: `  <GeomPoint
    alpha={0.55}
    size={1.4}
    aes={{ color: { value: "#4a5568" } }}
  />`,
        trend: `  <GeomLine
    stat="summary_rolling"
    fun="median"
    window={${SAKURA_TREND_WINDOW}}
    curve="linear"
    linewidth={1.8}
    aes={{ color: { value: "#262626" } }}
  />`,
      },
      childOrder: ["chartlineEarly", "chartlineLate", "points", "trend"],
    },
  },
  {
    id: "add-epoch-bands",
    title: "Add epochs",
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
      order: ["epochs", "epochNames", "chartlineEarly", "chartlineLate", "points", "trend"],
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
      childOrder: ["epochs", "epochNames", "chartlineEarly", "chartlineLate", "points", "trend"],
    },
  },
  {
    id: "annotate-record-years",
    title: "Annotate record years",
    outcome: "",
    explanation: "",
    fragment: `<GeomRule yintercept="${SAKURA_BASELINE}" linewidth={1}
  aes={{ color: { value: "#6b7075" } }} inspect={false} />
<GeomText data={baselineLabel}
  aes={{ x: "year", y: "bloomDate", label: "label",
         color: { value: "#6b7075" } }} size={9} anchor="start" dy={22}
  inspect={false} />
<GeomPoint data={ringLatest} shape="circle-open" size={3.5}
  aes={{ x: "year", y: "bloomDate", color: { value: "#2c5282" } }} />
<GeomPoint data={ringEarliest} shape="circle-open" size={3.5}
  aes={{ x: "year", y: "bloomDate", color: { value: "#c53030" } }} />
<GeomPoint data={recordRecent} size={3}
  aes={{ x: "year", y: "bloomDate", color: { value: "#c53030" } }} />
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
          // Solid and full strength: it marks the pre-industrial median, and
          // the short in-panel tag at the left edge says so (#727).
          aes: { color: { value: "#6b7075" } },
          params: { yintercept: SAKURA_BASELINE, linewidth: 1 },
          // Synthesizes an empty row — hovering it must not blank the blooms'
          // tooltips (#1068, same as the chartlines).
          inspect: false,
        },
        baselineLab: {
          geom: "text",
          data: { values: SAKURA_BASELINE_LABEL },
          aes: {
            x: { field: "year" },
            y: { field: "bloomDate" },
            label: { field: "label" },
            color: { value: "#6b7075" },
          },
          params: { size: 9, anchor: "start", dy: 22 },
          // Names the rule, like the epoch names name the bands (#1068).
          inspect: false,
        },
        ringLatest: {
          geom: "point",
          data: { values: SAKURA_RING_LATEST },
          aes: {
            x: { field: "year" },
            y: { field: "bloomDate" },
            color: { value: "#2c5282" },
          },
          params: { shape: "circle-open", size: 3.5 },
        },
        ringEarliest: {
          geom: "point",
          data: { values: SAKURA_RING_EARLIEST },
          aes: {
            x: { field: "year" },
            y: { field: "bloomDate" },
            color: { value: "#c53030" },
          },
          params: { shape: "circle-open", size: 3.5 },
        },
        recordRecent: {
          geom: "point",
          data: { values: SAKURA_RECORD_RECENT },
          aes: {
            x: { field: "year" },
            y: { field: "bloomDate" },
            color: { value: "#c53030" },
          },
          params: { size: 3 },
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
      order: [
        "epochs",
        "epochNames",
        "chartlineEarly",
        "chartlineLate",
        "points",
        "baseline",
        "baselineLab",
        "trend",
        "ringLatest",
        "ringEarliest",
        "recordRecent",
        "leaders",
        "callouts",
      ],
    },
    source: {
      components: ["GeomPoint", "GeomRule", "GeomSegment", "GeomText"],
      consts: [RECORDS_CONST, RINGS_CONST, BASELINE_LABEL_CONST],
      children: {
        baseline: `  <GeomRule
    yintercept="${SAKURA_BASELINE}"
    linewidth={1}
    aes={{ color: { value: "#6b7075" } }}
    inspect={false}
  />`,
        baselineLab: `  <GeomText
    data={baselineLabel}
    aes={{
      x: "year",
      y: "bloomDate",
      label: "label",
      color: { value: "#6b7075" },
    }}
    size={9}
    anchor="start"
    dy={22}
    inspect={false}
  />`,
        ringLatest: `  <GeomPoint
    data={ringLatest}
    shape="circle-open"
    size={3.5}
    aes={{ x: "year", y: "bloomDate", color: { value: "#2c5282" } }}
  />`,
        ringEarliest: `  <GeomPoint
    data={ringEarliest}
    shape="circle-open"
    size={3.5}
    aes={{ x: "year", y: "bloomDate", color: { value: "#c53030" } }}
  />`,
        recordRecent: `  <GeomPoint
    data={recordRecent}
    size={3}
    aes={{ x: "year", y: "bloomDate", color: { value: "#c53030" } }}
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
      childOrder: [
        "epochs",
        "epochNames",
        "chartlineEarly",
        "chartlineLate",
        "points",
        "baseline",
        "baselineLab",
        "trend",
        "ringLatest",
        "ringEarliest",
        "recordRecent",
        "leaders",
        "callouts",
      ],
    },
  },
  {
    id: "finish-it",
    title: "Make it interactive",
    outcome: "",
    explanation: "",
    // No title/subtitle/caption: chrome would squash the data panel. Citation
    // and the dashed-rule note live as a page footnote instead.
    fragment: `key="year"
  <Inspect mode="exact" pin />`,
    spec: {},
    source: {
      components: ["Inspect"],
      attrs: {
        key: `  key="year"`,
      },
      grammar: {
        inspect: `  <Inspect mode="exact" pin />`,
      },
    },
  },
];
