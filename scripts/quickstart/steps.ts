/**
 * Getting-started lesson data and step model.
 *
 * Epoch bands, record annotations, step types, and the seven SAKURA_STEPS
 * deltas (PortableSpec + Svelte source templates). Pure data — the fold that
 * accumulates steps lives in `./fold.ts`.
 */

import type { GuidesSpec, Labs, LayerSpec, Scales, ThemeName } from "@ggsvelte/spec";

export const QUICKSTART_PAGE_FILENAME = "src/routes/+page.svelte";

/** Bloom days are projected onto this non-leap year so a date axis can draw them. */
export const SAKURA_REFERENCE_YEAR = 2001;

/** Loess neighborhood fraction: large enough that the millennium reads flat. */
export const SAKURA_LOESS_SPAN = 0.4;

/** Median bloom day 1600–1850, drawn as the pre-industrial baseline. */
export const SAKURA_BASELINE = "2001-04-15";

const Y_TOP = "2001-03-18";
const Y_BOTTOM = "2001-05-10";

// --- the two lesson-only tables -------------------------------------------
// Both are small enough to read at a glance, and both are drawn by layers that
// carry their own `data` — the reason they exist as source in the lesson.

// `year` is the band's first year, so the plot's `key="year"` resolves on
// these rows too — every table the chart draws from speaks the same identity.
export const SAKURA_EPOCHS = [
  { epoch: "Medieval warm period", year: 812, until: 1300 },
  { epoch: "Little Ice Age", year: 1300, until: 1850 },
  { epoch: "Industrial era", year: 1850, until: 2026 },
].map((band) => ({ ...band, top: Y_TOP, bottom: Y_BOTTOM }));

/**
 * Where the bands meet. Drawn as hairlines so the epochs survive forced-colors
 * mode, where translucent fills are unreliable.
 */
export const SAKURA_EPOCH_EDGES = SAKURA_EPOCHS.slice(1).map((band) => ({ year: band.year }));

export const SAKURA_RECORDS = [
  {
    year: 1323,
    bloomRefDate: "2001-05-04",
    label: "1323 — latest on record",
    labelYear: 1150,
    labelDate: "2001-05-08",
  },
  {
    year: 1409,
    bloomRefDate: "2001-03-27",
    label: "1409 — earliest for six centuries",
    labelYear: 1480,
    labelDate: "2001-03-24",
  },
  {
    year: 2023,
    bloomRefDate: "2001-03-25",
    label: "2023 — earliest in 1,200 years",
    labelYear: 1790,
    labelDate: "2001-03-19",
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
   * Declaration-only grammar children (`<ScaleYDate>`, `<Labs>`,
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
  readonly chapterTitle: string;
  readonly href: string;
  readonly spec: SakuraSpecDelta;
  readonly source: SakuraSourceDelta;
}

const EPOCHS_CONST = `  // Full panel height, so the bands read as background, not as data.
  const span = { top: "${Y_TOP}", bottom: "${Y_BOTTOM}" };
  const epochs = [
${SAKURA_EPOCHS.map(
  (e) => `    { epoch: "${e.epoch}", year: ${e.year}, until: ${e.until}, ...span },`,
).join("\n")}
  ];`;

const RECORDS_CONST = `  const records = [
${SAKURA_RECORDS.map(
  (r) =>
    `    {\n      year: ${r.year}, bloomRefDate: "${r.bloomRefDate}",\n      labelYear: ${r.labelYear}, labelDate: "${r.labelDate}",\n      label: "${r.label}",\n    },`,
).join("\n")}
  ];`;

const EPOCH_EDGES_CONST = `  const epochEdges = [${SAKURA_EPOCH_EDGES.map((e) => `{ year: ${e.year} }`).join(", ")}];`;

const EPOCH_DOMAIN = SAKURA_EPOCHS.map((e) => `"${e.epoch}"`).join(", ");
const EPOCH_VALUES = '"#f5edc4", "#dce8f2", "#f3dcda"';

export const SAKURA_STEPS: readonly SakuraStep[] = [
  {
    id: "separate-signal-from-noise",
    title: "Separate the signal from the noise",
    outcome: "",
    explanation: "",
    fragment: `<GeomPoint alpha={0.5} size={1.6}
  aes={{ color: { value: "#777777" } }} />
<GeomSmooth method="loess" span={0.4} se={false} linewidth={1.8}
  aes={{ color: { value: "#262626" } }} />`,
    chapterTitle: "Statistics and positions",
    href: "/guide/statistics-positions#statistical-summaries",
    spec: {
      layers: {
        points: {
          geom: "point",
          aes: { color: { value: "#777777" } },
          params: { alpha: 0.5, size: 1.6 },
        },
        trend: {
          geom: "smooth",
          aes: { color: { value: "#262626" } },
          params: { method: "loess", span: SAKURA_LOESS_SPAN, se: false, linewidth: 1.8 },
        },
      },
      order: ["points", "trend"],
    },
    source: {
      components: ["GeomSmooth"],
      children: {
        points: `  <GeomPoint
    alpha={0.5}
    size={1.6}
    aes={{ color: { value: "#777777" } }}
  />`,
        trend: `  <GeomSmooth
    method="loess"
    span={${SAKURA_LOESS_SPAN}}
    se={false}
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
    fragment: `<ScaleYDate
  reverse
  dateBreaks="10 days"
  dateLabels="%b %d"
  domain={["${Y_BOTTOM}", "${Y_TOP}"]}
/>
<ScaleXContinuous labels="d" domain={[800, 2030]} />`,
    chapterTitle: "Scales and guides",
    href: "/guide/scales-guides#date-and-time-axes",
    spec: {
      scales: {
        y: {
          type: "time",
          temporalKind: "date",
          reverse: true,
          dateBreaks: "10 days",
          dateLabels: "%b %d",
          domain: [Y_BOTTOM, Y_TOP],
        },
        // `labels: "d"` because a year is not a quantity: the default numeric
        // formatter groups thousands, which renders 1000 CE as "1,000".
        x: { type: "linear", domain: [800, 2030], labels: "d" },
      },
      labs: { x: "Year", y: "Peak bloom" },
    },
    source: {
      components: ["ScaleYDate", "ScaleXContinuous"],
      grammar: {
        scaleY: `  <ScaleYDate
    reverse
    dateBreaks="10 days"
    dateLabels="%b %d"
    domain={["${Y_BOTTOM}", "${Y_TOP}"]}
  />`,
        scaleX: `  <ScaleXContinuous labels="d" domain={[800, 2030]} />`,
        labs: `  <Labs x="Year" y="Peak bloom" />`,
      },
    },
  },
  {
    id: "add-epoch-bands",
    title: "Add epoch bands",
    outcome: "",
    explanation: "",
    fragment: `<GeomRect
  data={epochs}
  aes={{
    x: null, y: null,
    xmin: "year", xmax: "until", ymin: "top", ymax: "bottom",
    fill: "epoch",
  }}
  alpha={0.55}
/>
<GeomRule data={epochEdges} aes={{ y: null, color: { value: "#c8ccd0" } }}
  linewidth={0.5} />
<ScaleFillManual
  domain={[${EPOCH_DOMAIN}]}
  values={[${EPOCH_VALUES}]}
/>
<GuideLegend channel="fill" position="bottom" direction="horizontal" />`,
    chapterTitle: "Layers and marks",
    href: "/guide/layers-marks#compose-layers",
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
        },
        epochEdges: {
          geom: "rule",
          data: { values: SAKURA_EPOCH_EDGES },
          aes: { y: null, color: { value: "#c8ccd0" } },
          params: { linewidth: 0.5 },
        },
      },
      order: ["epochs", "epochEdges", "points", "trend"],
      scales: {
        fill: {
          type: "manual",
          domain: SAKURA_EPOCHS.map((epoch) => epoch.epoch),
          range: ["#f5edc4", "#dce8f2", "#f3dcda"],
        },
      },
      guides: {
        fill: { type: "legend", position: "bottom", direction: "horizontal" },
      },
    },
    source: {
      components: ["GeomRect", "GeomRule", "ScaleFillManual", "GuideLegend"],
      consts: [EPOCHS_CONST, EPOCH_EDGES_CONST],
      grammar: {
        scaleFill: `  <ScaleFillManual
    domain={[${EPOCH_DOMAIN}]}
    values={[${EPOCH_VALUES}]}
  />`,
        guides: `  <GuideLegend channel="fill" position="bottom" direction="horizontal" />`,
      },
      children: {
        epochEdges: `  <GeomRule
    data={epochEdges}
    aes={{ y: null, color: { value: "#c8ccd0" } }}
    linewidth={0.5}
  />`,
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
  />`,
      },
      childOrder: ["epochs", "epochEdges", "points", "trend"],
    },
  },
  {
    id: "annotate-record-years",
    title: "Annotate record years",
    outcome: "",
    explanation: "",
    fragment: `<GeomRule yintercept="${SAKURA_BASELINE}" linewidth={0.75} alpha={0.7}
  aes={{ color: { value: "#9aa0a6" }, linetype: { value: "dashed" } }} />
<GeomSegment data={records}
  aes={{ x: "labelYear", y: "labelDate", xend: "year",
         yend: "bloomRefDate", color: { value: "#b3452f" } }} linewidth={0.7} />
<GeomText data={records}
  aes={{ x: "labelYear", y: "labelDate", label: "label",
         color: { value: "#b3452f" } }} size={11} />`,
    chapterTitle: "Data and mappings",
    href: "/guide/data-mappings#keep-data-local",
    spec: {
      layers: {
        baseline: {
          geom: "rule",
          aes: { color: { value: "#9aa0a6" }, linetype: { value: "dashed" } },
          params: { yintercept: SAKURA_BASELINE, linewidth: 0.75, alpha: 0.7 },
        },
        leaders: {
          geom: "segment",
          data: { values: SAKURA_RECORDS },
          aes: {
            x: { field: "labelYear" },
            y: { field: "labelDate" },
            xend: { field: "year" },
            yend: { field: "bloomRefDate" },
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
          params: { size: 11 },
        },
      },
      order: ["epochs", "epochEdges", "points", "baseline", "trend", "leaders", "callouts"],
    },
    source: {
      components: ["GeomSegment", "GeomText"],
      consts: [RECORDS_CONST],
      children: {
        baseline: `  <GeomRule
    yintercept="${SAKURA_BASELINE}"
    linewidth={0.75}
    alpha={0.7}
    aes={{ color: { value: "#9aa0a6" }, linetype: { value: "dashed" } }}
  />`,
        leaders: `  <GeomSegment
    data={records}
    aes={{
      x: "labelYear",
      y: "labelDate",
      xend: "year",
      yend: "bloomRefDate",
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
  />`,
      },
      childOrder: ["epochs", "epochEdges", "points", "baseline", "trend", "leaders", "callouts"],
    },
  },
  {
    id: "finish-it",
    title: "Finish it",
    outcome: "",
    explanation: "",
    fragment: `<ThemeTufte />
<Labs
  title="Kyoto cherry blossom, 812–2026"
  subtitle="Bloom now arrives about a week earlier than it did for a millennium"
  caption="838 observations. Data: Yasuyuki Aono (2008, 2010)."
  x="Year"
  y="Peak bloom"
  fill="Climate epoch"
/>`,
    chapterTitle: "Themes and color",
    href: "/guide/themes-color#choose-a-chart-theme",
    spec: {
      theme: "tufte",
      labs: {
        title: "Kyoto cherry blossom, 812–2026",
        subtitle: "Bloom now arrives about a week earlier than it did for a millennium",
        caption: "838 observations. Data: Yasuyuki Aono (2008, 2010).",
        x: "Year",
        y: "Peak bloom",
        fill: "Climate epoch",
      },
    },
    source: {
      components: ["ThemeTufte"],
      grammar: {
        theme: `  <ThemeTufte />`,
        labs: `  <Labs
    x="Year"
    y="Peak bloom"
    title="Kyoto cherry blossom, 812–2026"
    subtitle="Bloom now arrives about a week earlier than it did for a millennium"
    caption="838 observations. Data: Yasuyuki Aono (2008, 2010)."
    fill="Climate epoch"
  />`,
      },
    },
  },
  {
    id: "inspect-and-pin",
    title: "Inspect and pin",
    outcome: "",
    explanation: "",
    fragment: `key="year"
inspect={{ mode: "exact", pin: true }}`,
    chapterTitle: "Inspect and pin",
    href: "/guide/inspect-pin#inspect-and-pin",
    spec: {},
    source: {
      attrs: {
        key: `  key="year"`,
        inspect: `  inspect={{ mode: "exact", pin: true }}`,
      },
    },
  },
];
