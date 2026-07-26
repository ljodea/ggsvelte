/**
 * The getting-started lesson, as data.
 *
 * One chart is built across seven renders: a plain scatter of 838 Kyoto
 * cherry-blossom observations, then six steps that each add one grammar
 * element. Every step declares two deltas — the PortableSpec the live chart
 * renders from, and the Svelte source the reader copies — and `foldSakura`
 * accumulates both. The page never re-derives either, so the chart on screen,
 * the fragment beside it, and the finished file at the end cannot drift
 * (asserted in scripts/sakura-lesson.test.ts).
 *
 * Shared byte-for-byte by the docs site, the llms surfaces, and the packed
 * consumer-compat fixture app.
 */

import type { GuidesSpec, Labs, LayerSpec, PortableSpec, Scales, ThemeName } from "@ggsvelte/spec";

export const QUICKSTART_PAGE_FILENAME = "src/routes/+page.svelte";

/** Bloom days are projected onto this non-leap year so a date axis can draw them. */
export const SAKURA_REFERENCE_YEAR = 2001;

/** Loess neighborhood fraction: large enough that the millennium reads flat. */
export const SAKURA_LOESS_SPAN = 0.4;

/** Median bloom day 1600–1850, drawn as the pre-industrial baseline. */
export const SAKURA_BASELINE = "2001-04-15";

const Y_TOP = "2001-03-18";
const Y_BOTTOM = "2001-05-10";

const ARIA_LABEL = "Kyoto peak bloom, 812 to 2026: about a week earlier since 1850";

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

// --- the fold --------------------------------------------------------------

/** A row of the plot-level dataset (the shape kyotoSakura rows have). */
export type SakuraRow = Record<string, string | number>;

export interface SakuraFold {
  /** The PortableSpec this step's chart renders from. */
  readonly spec: PortableSpec;
  /** The complete `+page.svelte` at this step. */
  readonly source: string;
  /** Runtime-only <GGPlot> props, which are not spec fields. */
  readonly key: string | undefined;
  readonly inspect: { mode: "exact"; pin: true } | undefined;
}

const BASE_LAYERS: Record<string, LayerSpec> = { points: { geom: "point" } };
const BASE_ORDER = ["points"];
const BASE_CHILDREN: Record<string, string> = { points: "  <GeomPoint />" };
/** Readable defaults so the first chart does not ship camelCase axis titles or grouped year ticks. */
const BASE_SCALES: Scales = { x: { type: "linear", labels: "d" } };
const BASE_LABS: Labs = { x: "Year", y: "Peak bloom" };
const BASE_GRAMMAR: Record<string, string> = {
  scaleX: `  <ScaleXContinuous labels="d" />`,
  labs: `  <Labs x="Year" y="Peak bloom" />`,
};
const BASE_COMPONENTS = ["GeomPoint", "GGPlot", "Labs", "ScaleXContinuous"] as const;

/**
 * Emission order for the grammar children, outermost concern first: how the
 * chart looks, then how values map to the page, then what it is called. None
 * of these can override another, so this is readability only.
 */
const GRAMMAR_ORDER = ["theme", "scaleY", "scaleX", "scaleFill", "guides", "labs"] as const;

/** Layers that only make sense when the chart is wide enough to place text. */
export const SAKURA_ANNOTATION_LAYERS = ["leaders", "callouts"] as const;

export interface FoldSakuraOptions {
  /**
   * Drop the record callouts and their leader lines. The page does this below
   * a ~560px chart container, where hand-placed text collides with the data;
   * the records move to the caption instead. Bands, trend, baseline and points
   * are never dropped.
   */
  readonly annotations?: boolean;
}

/**
 * Accumulate the first `count` steps (0 = the first render). Pure: the same
 * count always yields the same spec and the same source text.
 */
export function foldSakura(
  count: number,
  rows: readonly SakuraRow[] = [],
  options: FoldSakuraOptions = {},
): SakuraFold {
  const steps = SAKURA_STEPS.slice(0, Math.max(0, Math.min(count, SAKURA_STEPS.length)));

  const layers: Record<string, LayerSpec> = { ...BASE_LAYERS };
  let order: readonly string[] = BASE_ORDER;
  let scales: Scales = { ...BASE_SCALES };
  let guides: GuidesSpec | undefined;
  let labs: Labs | undefined = { ...BASE_LABS };
  let theme: ThemeName | undefined;

  const components = new Set<string>(BASE_COMPONENTS);
  const consts: string[] = [];
  const attrs = new Map<string, string>([
    ["data", "  data={kyotoSakura}"],
    ["aes", `  aes={{ x: "year", y: "bloomRefDate" }}`],
  ]);
  const children: Record<string, string> = { ...BASE_CHILDREN };
  const grammar: Record<string, string> = { ...BASE_GRAMMAR };
  let childOrder: readonly string[] = BASE_ORDER;

  for (const step of steps) {
    Object.assign(layers, step.spec.layers ?? {});
    if (step.spec.order !== undefined) order = step.spec.order;
    scales = { ...scales, ...step.spec.scales };
    if (step.spec.guides !== undefined) guides = { ...guides, ...step.spec.guides };
    if (step.spec.labs !== undefined) labs = { ...labs, ...step.spec.labs };
    if (step.spec.theme !== undefined) theme = step.spec.theme;

    for (const component of step.source.components ?? []) components.add(component);
    consts.push(...(step.source.consts ?? []));
    for (const [name, text] of Object.entries(step.source.attrs ?? {})) attrs.set(name, text);
    Object.assign(grammar, step.source.grammar ?? {});
    Object.assign(children, step.source.children ?? {});
    if (step.source.childOrder !== undefined) childOrder = step.source.childOrder;
  }

  const drawn =
    options.annotations === false
      ? order.filter((name) => !SAKURA_ANNOTATION_LAYERS.includes(name as never))
      : order;

  const spec: PortableSpec = {
    data: { values: [...rows] },
    aes: { x: { field: "year" }, y: { field: "bloomRefDate" } },
    layers: drawn.map((name) => layers[name]!),
    ...(Object.keys(scales).length > 0 && { scales }),
    ...(guides !== undefined && { guides }),
    ...(labs !== undefined && { labs }),
    ...(theme !== undefined && { theme }),
  };

  attrs.set("ariaLabel", `  ariaLabel="${ARIA_LABEL}"`);
  const imported = [...components].toSorted((a, b) => a.localeCompare(b));
  // Wrap the component import once it stops fitting on one readable line.
  const imports =
    imported.join(", ").length > 60
      ? `{\n${imported.map((name) => `    ${name},`).join("\n")}\n  }`
      : `{ ${imported.join(", ")} }`;
  const script = [
    `  import ${imports} from "@ggsvelte/svelte";`,
    `  import { kyotoSakura } from "@ggsvelte/svelte/data";`,
    ...(consts.length > 0 ? ["", ...consts] : []),
  ].join("\n");

  const source = `<script lang="ts">
${script}
</script>

<svelte:head><title>Kyoto cherry blossom</title></svelte:head>

<GGPlot
${[...attrs.values()].join("\n")}
>
${[...GRAMMAR_ORDER.filter((name) => grammar[name] !== undefined).map((name) => grammar[name]!), ...childOrder.map((name) => children[name]!)].join("\n")}
</GGPlot>`;

  return {
    spec,
    source,
    key: attrs.has("key") ? "year" : undefined,
    inspect: attrs.has("inspect") ? { mode: "exact", pin: true } : undefined,
  };
}

/** The honest starting chart: 838 points, default everything, noise winning. */
export const QUICKSTART_PAGE_SVELTE = foldSakura(0).source;

/** The chart the lesson is building toward. */
export const SAKURA_FINISHED_SVELTE = foldSakura(SAKURA_STEPS.length).source;

/**
 * Section headings of the HUMAN getting-started page, in page order.
 *
 * `/guide/getting-started` is the one route whose prose is a Svelte component
 * rather than guide markdown (the markdown at that slug is the agent doc, which
 * is deliberately a different document — see D6 in the overhaul plan). Its
 * on-this-page navigation is generated from this list, and
 * scripts/getting-started-headings.test.ts asserts the component really renders
 * each id.
 */
export const GETTING_STARTED_PAGE_HEADINGS = [
  { id: "install", title: "Install", level: 2 },
  { id: "start-with-a-basic-plot", title: "Start with a basic plot", level: 2 },
  { id: "add-geometry-layers", title: "Add geometry layers", level: 2 },
  ...SAKURA_STEPS.map((step) => ({ id: step.id, title: step.title, level: 3 as const })),
  { id: "the-chart", title: "The chart", level: 2 },
  { id: "the-finished-file", title: "The finished file", level: 2 },
  { id: "built-for-agents", title: "Built for agents", level: 2 },
  { id: "the-rest-of-the-grammar", title: "The rest of the grammar", level: 2 },
  { id: "where-next", title: "Where next", level: 2 },
] as const satisfies readonly { id: string; title: string; level: 2 | 3 }[];

/** The `<title>` the quickstart page sets, read from the file itself. */
export function quickstartTitle(): string {
  const match = /<title>([^<]+)<\/title>/.exec(QUICKSTART_PAGE_SVELTE);
  if (match === null) throw new Error("quickstart page has no <title>");
  return `<title>${match[1]!}</title>`;
}

/** The chart's accessible name, read from the file itself. */
export function quickstartAriaLabel(): string {
  const match = /ariaLabel="([^"]+)"/.exec(QUICKSTART_PAGE_SVELTE);
  if (match === null) throw new Error("quickstart page has no ariaLabel");
  return match[1]!;
}

export function sakuraLessonMarkdown(): string {
  return SAKURA_STEPS.map((step) => {
    const parts = [`### ${step.title}`];
    if (step.outcome !== "") parts.push("", step.outcome);
    parts.push("", "```svelte", step.fragment, "```");
    if (step.explanation !== "") parts.push("", step.explanation);
    parts.push("", `[Read ${step.chapterTitle}](${step.href}).`);
    return parts.join("\n");
  }).join("\n\n");
}

// --- the agent surface -----------------------------------------------------
// These live on /llms.txt and in the "Built for agents" section, not in the
// human walkthrough: their audience is code that emits specs, not a reader
// following along in an editor.

export const QUICKSTART_BUILDER_FRAGMENT = `import { aes, gg } from "@ggsvelte/svelte";
import { kyotoSakura } from "@ggsvelte/svelte/data";

const spec = gg(kyotoSakura, aes({ x: "year", y: "bloomRefDate" }))
  .geomPoint()
  .geomSmooth({ method: "loess", span: ${SAKURA_LOESS_SPAN} })
  .spec();`;

/**
 * The reference form: large or reused data goes in `datasets` by name, in
 * columns form. Inline `values` is for data small enough to read.
 */
export const QUICKSTART_PORTABLE_SPEC_FRAGMENT = `{
  "data": { "name": "kyotoSakura" },
  "datasets": {
    "kyotoSakura": {
      "columns": {
        "year": [812, 815, 831, 851, 853],
        "bloomRefDate": ["2001-04-01", "2001-04-14", "2001-04-05", "2001-04-17", "2001-04-13"]
      }
    }
  },
  "aes": { "x": { "field": "year" }, "y": { "field": "bloomRefDate" } },
  "layers": [
    { "geom": "point", "params": { "alpha": 0.5 } },
    { "geom": "smooth", "params": { "method": "loess", "span": ${SAKURA_LOESS_SPAN} } }
  ]
}`;

export const QUICKSTART_HEADLESS_FRAGMENT = `import { renderToSVGString } from "@ggsvelte/core";

const svg = renderToSVGString(spec, { width: 900, height: 480 });`;

export const QUICKSTART_CLI_FRAGMENT = "ggsvelte-render spec.json > chart.svg 2> diagnostics.jsonl";
