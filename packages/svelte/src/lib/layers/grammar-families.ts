/**
 * Single source of truth for the seven grammar families (#785 / #659).
 *
 * Prop names, components, composition rules, doc anchors, deprecation windows,
 * codemod forms, and suggestion copy live here. Consumers look up; they do not
 * restate. `plot-props.ts` JSDoc keeps since/URL for the deprecation-wiring
 * guard and is ratcheted against this table.
 */
import type { GrammarLayerKind } from "./types.js";

const GUIDE = "https://ggsvelte.sh/guide/upgrading";

/** How sibling children of the same kind compose when folding into the builder. */
type GrammarComposition = "merge-by-channel" | "merge-by-key" | "replace";

/** How a deprecated prop's value is handed to its replacement component. */
export type GrammarCodemodForm = "value" | "spread" | "theme";

/** Fluent-builder method that receives this family's value. */
type GrammarBuilderMethod = "scales" | "theme" | "coord" | "facet" | "labs" | "guides" | "legend";

export type GrammarFamilyMeta = {
  readonly kind: GrammarLayerKind;
  /** Deprecated `<GGPlot>` prop name (`scales` for kind `scale`). */
  readonly propName: string;
  /** Codemod escape-hatch component name. */
  readonly component: string;
  readonly codemodForm: GrammarCodemodForm;
  readonly composition: GrammarComposition;
  /** Heading anchor on /guide/upgrading (without `#`). */
  readonly docAnchor: string;
  readonly since: string;
  readonly removeIn: string;
  readonly suggestions: readonly string[];
  readonly builderMethod: GrammarBuilderMethod;
  /** DUPLICATE_MERGE_KEY message helpers (merge-by-key only). */
  readonly mergeKeyNoun?: string;
  readonly mergeKeyChild?: string;
};

type GrammarFamilies = {
  readonly [K in GrammarLayerKind]: GrammarFamilyMeta & { readonly kind: K };
};

/**
 * Authoritative metadata for every non-mark grammar family.
 * Key order is insertion order (scale → theme → …); consumers that need a
 * different emission order must use the explicit order constants below.
 */
export const GRAMMAR_FAMILIES: GrammarFamilies = {
  scale: {
    kind: "scale",
    propName: "scales",
    component: "Scale",
    codemodForm: "value",
    composition: "merge-by-channel",
    docAnchor: "compose-scales-as-child-layers",
    since: "0.11.0",
    removeIn: "0.13.0",
    builderMethod: "scales",
    suggestions: [
      'Replace scales={scaleColorDiscrete({scheme:"colorblind"})} with <ScaleColorDiscrete scheme="colorblind" />',
      "Prefer named shells (<ScaleXContinuous/>, <ScaleSizeContinuous/>, <ScaleShapeDiscrete/>, …) for every family",
      "Use <Scale value={…} /> as the escape hatch for raw/computed scale fragments",
    ],
  },
  theme: {
    kind: "theme",
    propName: "theme",
    component: "Theme",
    codemodForm: "theme",
    composition: "replace",
    docAnchor: "compose-the-theme-as-a-child-layer",
    since: "0.11.0",
    removeIn: "0.13.0",
    builderMethod: "theme",
    suggestions: [
      'Replace theme="dark" with <ThemeDark /> (or <Theme name="dark" />)',
      'Role overrides stay as props on the child: <ThemeDark ink="#eee" />',
    ],
  },
  coord: {
    kind: "coord",
    propName: "coord",
    component: "Coord",
    codemodForm: "value",
    composition: "replace",
    docAnchor: "compose-coord-as-a-child-layer",
    since: "0.11.0",
    removeIn: "0.13.0",
    builderMethod: "coord",
    suggestions: [
      'Replace coord="flip" with <CoordFlip />',
      "Use <CoordFixed ratio={…} />, <CoordTransform />, or <Coord value={…} /> for other systems",
    ],
  },
  facet: {
    kind: "facet",
    propName: "facet",
    component: "Facet",
    codemodForm: "spread",
    composition: "replace",
    docAnchor: "compose-facet-as-a-child-layer",
    since: "0.11.0",
    removeIn: "0.13.0",
    builderMethod: "facet",
    suggestions: [
      'Replace facet={{wrap:"g"}} with <FacetWrap field="g" />',
      'Use <FacetGrid rows="a" cols="b" /> for a grid, or <Facet wrap={…} /> for the full FacetInput surface',
    ],
  },
  labs: {
    kind: "labs",
    propName: "labs",
    component: "Labs",
    codemodForm: "spread",
    composition: "merge-by-key",
    docAnchor: "compose-labs-as-a-child-layer",
    since: "0.11.0",
    removeIn: "0.13.0",
    builderMethod: "labs",
    mergeKeyNoun: "label",
    mergeKeyChild: "<Labs>",
    suggestions: [
      'Replace labs={{title:"Sales"}} with <Labs title="Sales" />',
      'Per-aesthetic titles stay named props on the child: <Labs x="Quarter" color="Region" />',
    ],
  },
  guides: {
    kind: "guides",
    propName: "guides",
    component: "Guides",
    codemodForm: "value",
    composition: "merge-by-key",
    docAnchor: "compose-guides-as-child-layers",
    since: "0.11.0",
    removeIn: "0.13.0",
    builderMethod: "guides",
    mergeKeyNoun: "channel",
    mergeKeyChild: "<Guide*>",
    suggestions: [
      'Replace guides={{color:guideLegend({position:"bottom"})}} with <GuideLegend channel="color" position="bottom" />',
      'The aesthetic is the channel prop: <GuideAxis channel="x"/>, <GuideNone channel="size"/>, …',
      "Use <Guides value={…} /> as the escape hatch for raw/computed guide bags",
    ],
  },
  legend: {
    kind: "legend",
    propName: "legend",
    component: "Legend",
    codemodForm: "spread",
    composition: "merge-by-key",
    docAnchor: "compose-legend-as-a-child-layer",
    since: "0.11.0",
    removeIn: "0.13.0",
    builderMethod: "legend",
    mergeKeyNoun: "option",
    mergeKeyChild: "<Legend>",
    suggestions: [
      'Replace legend={{order:"sorted"}} with <Legend order="sorted" />',
      "<Legend order> is the plot-wide entry-sort enum; <GuideLegend order={2}/> is a per-aesthetic placement rank",
    ],
  },
};

/** Deprecation advisory emission order (preserves pre-#785 ladder). */
export const DEPRECATION_EMIT_ORDER: readonly GrammarLayerKind[] = [
  "theme",
  "scale",
  "coord",
  "facet",
  "guides",
  "legend",
  "labs",
] as const;

/**
 * GGPlotProps / codemod RULES order (declaration order in plot-props.ts).
 * Codemod `changes[]` ordering depends on this.
 */
export const GGPLOT_PROP_ORDER: readonly GrammarLayerKind[] = [
  "facet",
  "coord",
  "scale",
  "guides",
  "legend",
  "theme",
  "labs",
] as const;

/** DUPLICATE_MERGE_KEY advisory emission order. */
export const MERGE_KEY_EMIT_ORDER = [
  "labs",
  "guides",
  "legend",
] as const satisfies readonly GrammarLayerKind[];

/** DUPLICATE_PLOT_LAYER advisory emission order. */
export const REPLACE_EMIT_ORDER = [
  "coord",
  "facet",
  "theme",
] as const satisfies readonly GrammarLayerKind[];

export type MergeByKeyKind = (typeof MERGE_KEY_EMIT_ORDER)[number];
export type ReplaceKind = (typeof REPLACE_EMIT_ORDER)[number];

export function grammarFamilyByProp(propName: string): GrammarFamilyMeta | undefined {
  for (const kind of DEPRECATION_EMIT_ORDER) {
    const family = GRAMMAR_FAMILIES[kind];
    if (family.propName === propName) return family;
  }
  return undefined;
}

/** Deprecated GGPlot prop names in GGPlotProps order. */
export const GRAMMAR_PROP_NAMES: readonly string[] = GGPLOT_PROP_ORDER.map(
  (kind) => GRAMMAR_FAMILIES[kind].propName,
);

/** Full upgrading-guide docUrl for a family. */
export function grammarDocUrl(kind: GrammarLayerKind): string {
  return `${GUIDE}#${GRAMMAR_FAMILIES[kind].docAnchor}`;
}

/** Absolute docUrls for every family (catalog-anchor tests). */
export const GRAMMAR_DOC_URLS: readonly string[] = (
  Object.keys(GRAMMAR_FAMILIES) as GrammarLayerKind[]
).map((kind) => grammarDocUrl(kind));

/**
 * Regex matching deprecated grammar props on `<GGPlot` or at line start.
 * Same shape as the pre-#785 `DEPRECATED_PROP` in repo-child-layers.
 */
export function deprecatedGrammarPropPattern(): RegExp {
  const names = GRAMMAR_PROP_NAMES.join("|");
  return new RegExp(`(?:^\\s*|<GGPlot\\s+)(${names})=`, "gm");
}

/** Codemod rule bag keyed by prop name, in GGPLOT_PROP_ORDER. */
export function grammarCodemodRules(): Readonly<
  Record<
    string,
    { readonly component: string; readonly form: GrammarCodemodForm; readonly docUrl: string }
  >
> {
  const rules: Record<
    string,
    { readonly component: string; readonly form: GrammarCodemodForm; readonly docUrl: string }
  > = {};
  for (const kind of GGPLOT_PROP_ORDER) {
    const family = GRAMMAR_FAMILIES[kind];
    rules[family.propName] = {
      component: family.component,
      form: family.codemodForm,
      docUrl: grammarDocUrl(kind),
    };
  }
  return rules;
}

export type GrammarPropReaders = {
  readonly theme: () => unknown;
  readonly scales: () => unknown;
  readonly coord: () => unknown;
  readonly facet: () => unknown;
  readonly guides: () => unknown;
  readonly legend: () => unknown;
  readonly labs: () => unknown;
};

/**
 * Build deprecation diagnostic inputs for every defined grammar prop,
 * in {@link DEPRECATION_EMIT_ORDER}.
 */
export function grammarDeprecationInputs(readers: GrammarPropReaders): ReadonlyArray<{
  readonly prop: string;
  readonly since: string;
  readonly removeIn: string;
  readonly suggestions: readonly string[];
  readonly anchor: string;
}> {
  const out: Array<{
    readonly prop: string;
    readonly since: string;
    readonly removeIn: string;
    readonly suggestions: readonly string[];
    readonly anchor: string;
  }> = [];
  for (const kind of DEPRECATION_EMIT_ORDER) {
    const family = GRAMMAR_FAMILIES[kind];
    const reader = readers[family.propName as keyof GrammarPropReaders];
    if (reader() === undefined) continue;
    out.push({
      prop: family.propName,
      since: family.since,
      removeIn: family.removeIn,
      suggestions: family.suggestions,
      anchor: family.docAnchor,
    });
  }
  return out;
}
