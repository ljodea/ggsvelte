/**
 * Pure fold of the sakura lesson steps into a PortableSpec + complete Svelte source.
 *
 * Same count always yields the same spec and the same source text. Shared by the
 * docs site, llms surfaces, and the packed consumer-compat fixture.
 */

import type { GuidesSpec, Labs, LayerSpec, PortableSpec, Scales, ThemeName } from "@ggsvelte/spec";

import { SAKURA_STEPS, SAKURA_Y_LAB } from "./steps";

const ARIA_LABEL = "Kyoto peak bloom, 812 to 2026: about a week earlier since 1850";

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
/**
 * Readable defaults so the first chart does not ship camelCase axis titles or
 * grouped year ticks. `bloomDate` is a full ISO date per year; month-day y
 * collapses the year so the scatter is bloom timing, not a year-vs-year
 * diagonal. Reverse matches the "earlier ↑" lab from the first render.
 * X domain is fixed from the first render so year ticks stay stable as steps
 * add chrome (labels: "d" so 1000 CE is not "1,000").
 */
const BASE_SCALES: Scales = {
  x: { type: "linear", labels: "d", domain: [800, 2030] },
  y: { type: "time", temporalKind: "monthDay", reverse: true },
};
const BASE_LABS: Labs = { x: "Year", y: SAKURA_Y_LAB };
const BASE_GRAMMAR: Record<string, string> = {
  scaleY: `  <ScaleYMonthDay reverse />`,
  scaleX: `  <ScaleXContinuous labels="d" domain={[800, 2030]} />`,
  labs: `  <Labs x="Year" y="${SAKURA_Y_LAB}" />`,
};
const BASE_COMPONENTS = [
  "GeomPoint",
  "GGPlot",
  "Labs",
  "ScaleXContinuous",
  "ScaleYMonthDay",
] as const;

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
    ["aes", `  aes={{ x: "year", y: "bloomDate" }}`],
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
    aes: { x: { field: "year" }, y: { field: "bloomDate" } },
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
