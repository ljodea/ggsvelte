export const QUICKSTART_PAGE_FILENAME = "src/routes/+page.svelte";

export const QUICKSTART_BUILDER_FRAGMENT = `import { aes, gg } from "@ggsvelte/svelte";

const spec = gg(cars, aes({ x: "weight", y: "economy" }))
  .geomPoint()
  .spec();`;

export const QUICKSTART_PORTABLE_SPEC_FRAGMENT = `{
  "data": { "values": [{ "weight": 1.8, "economy": 37 }] },
  "layers": [
    {
      "geom": "point",
      "aes": {
        "x": { "field": "weight" },
        "y": { "field": "economy" }
      }
    }
  ]
}`;

export const QUICKSTART_HEADLESS_FRAGMENT = `import { renderToSVGString } from "@ggsvelte/core";

const svg = renderToSVGString(spec, { width: 640, height: 400 });`;

export const QUICKSTART_CLI_FRAGMENT = "ggsvelte-render spec.json > chart.svg";

/**
 * Complete first-chart fixture shared byte-for-byte by docs and packed consumers.
 * Keep this beginner surface to framework-native Svelte composition only.
 */
export interface QuickstartLessonStep {
  id: string;
  title: string;
  outcome: string;
  fragment: string;
  explanation: string;
  chapterTitle: string;
  href: string;
}

export const QUICKSTART_LESSON_STEPS = [
  {
    id: "map-fields-to-position",
    title: "Map fields to position",
    outcome: "Map fields to x and y; source rows stay unchanged.",
    fragment: 'aes={{ x: "weight", y: "economy" }}',
    explanation: "aes names channels; it does not reshape the data.",
    chapterTitle: "Data and mappings",
    href: "/guide/data-mappings#map-fields-to-position",
  },
  {
    id: "add-a-second-layer",
    title: "Add a second layer",
    outcome: "Line under points; both layers share plot aes.",
    fragment: "<GeomLine />\n<GeomPoint />",
    explanation: "Layers paint in source order; a layer may override mapping or data.",
    chapterTitle: "Layers and marks",
    href: "/guide/layers-marks#compose-layers",
  },
  {
    id: "make-color-meaning-explicit",
    title: "Make color meaning explicit",
    outcome: "Discrete color via a named categorical scheme.",
    fragment:
      'aes={{ x: "weight", y: "economy", color: "vehicleClass" }}\nscales={{ color: { scheme: "observable10" } }}',
    explanation: "Scale owns data color; theme changes do not reassign categories.",
    chapterTitle: "Scales and guides",
    href: "/guide/scales-guides#categorical-color",
  },
  {
    id: "add-a-statistical-smoother",
    title: "Add a statistical smoother",
    outcome: "Add a fitted trend layer over the points.",
    fragment: '<GeomSmooth method="lm" />',
    explanation: "Stat derives marks from mapped rows; point layer stays.",
    chapterTitle: "Statistics and positions",
    href: "/guide/statistics-positions#statistical-summaries",
  },
  {
    id: "facet-the-comparison",
    title: "Facet the comparison",
    outcome: "One panel per vehicle class.",
    fragment: 'facet={{ wrap: "vehicleClass", ncol: 2 }}',
    explanation: "Facets partition rows before panel stats; color identity is shared.",
    chapterTitle: "Facets and coordinates",
    href: "/guide/facets-coordinates#facet-a-comparison",
  },
  {
    id: "choose-a-chart-theme",
    title: "Choose a chart theme",
    outcome: "Set theme without changing mappings or category colors.",
    fragment: 'theme="economist"',
    explanation: "Theme is independent of site appearance and data color scales.",
    chapterTitle: "Themes and color",
    href: "/guide/themes-color#choose-a-chart-theme",
  },
  {
    id: "enable-inspect-and-pin",
    title: "Enable inspect and pin",
    outcome: "Inspect/pin with keyboard and pointer; stable key required.",
    fragment: 'key="id"\ninspect={{ mode: "exact", pin: true }}',
    explanation: "Inspection is chart-local unless a shared controller is passed.",
    chapterTitle: "Inspect and pin",
    href: "/guide/inspect-pin#inspect-and-pin",
  },
] as const satisfies readonly QuickstartLessonStep[];

export function quickstartLessonMarkdown(): string {
  return QUICKSTART_LESSON_STEPS.map(
    (step) =>
      `### ${step.title}\n\n${step.outcome}\n\n\`\`\`svelte fragment\n${step.fragment}\n\`\`\`\n\n${step.explanation}\n\n[Read ${step.chapterTitle}](${step.href}).`,
  ).join("\n\n");
}

export const QUICKSTART_PAGE_SVELTE = `<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  const cars = [
    { weight: 1.8, economy: 37 },
    { weight: 2.4, economy: 31 },
    { weight: 3.1, economy: 25 },
    { weight: 4.0, economy: 19 },
  ];
</script>

<svelte:head><title>My first ggsvelte chart</title></svelte:head>

<h1>Fuel economy by vehicle weight</h1>
<GGPlot
  data={cars}
  aes={{ x: "weight", y: "economy" }}
  ariaLabel="Fuel economy decreases as vehicle weight increases"
>
  <GeomPoint />
</GGPlot>`;
