/**
 * Inspect-mode × geom advisories: pure collectors shared by the host
 * (plot-engine → ondiagnostic) and the headless CLI (`--inspect MODE`).
 *
 * Vertical axis guides that fight bar/col geometry or bisect on-mark value
 * labels, plus high-cardinality discrete color/fill + inspect (#1274).
 *
 * Host inspect mode is intentionally not a PortableSpec field. Agents declare
 * the host's intended mode via `ggsvelte-render --inspect <mode>` so the same
 * codes reach the CLI/agent JSONL loop (#1531).
 *
 * Auto/exact modes never fire the bar/col axis-guide codes: auto already picks
 * exact for bar/col (candidateAutoMode).
 */
// @lifecycle stable

/** Codes owned by this pure collector surface (subset of host interaction codes). */
export type InspectGeomAdvisoryCode =
  | "INTERACTION_INSPECT_X_ON_COL"
  | "INTERACTION_INSPECT_X_ON_BAR"
  | "INTERACTION_INSPECT_X_BISECTS_COL_LABELS"
  | "INTERACTION_INSPECT_X_BISECTS_BAR_LABELS"
  | "INTERACTION_INSPECT_HIGH_CARDINALITY_DISCRETE";

export interface InspectGeomAdvisory {
  readonly severity: "error" | "warning" | "advisory";
  readonly code: InspectGeomAdvisoryCode;
  readonly message: string;
  readonly prop: string;
  readonly actual?: unknown;
  readonly suggestions: ReadonlyArray<string>;
  readonly docUrl: string;
}

/**
 * Catalog slice for inspect×geom advisories. Host INTERACTION_DIAGNOSTIC_CATALOG
 * re-exports these entries so messages stay single-sourced.
 */
export const INSPECT_GEOM_DIAGNOSTIC_CATALOG: Readonly<
  Record<InspectGeomAdvisoryCode, Omit<InspectGeomAdvisory, "actual">>
> = Object.freeze({
  INTERACTION_INSPECT_X_ON_COL: {
    severity: "advisory",
    code: "INTERACTION_INSPECT_X_ON_COL",
    message:
      "inspect.mode draws a vertical guide through column marks; columns already encode x as a filled band, so the guide cuts the bar body and rarely adds information.",
    prop: "inspect.mode",
    suggestions: [
      'Use inspect={{ mode: "exact" }} (or leave mode as "auto") for GeomCol',
      "Prefer muteSiblings for sibling de-emphasis instead of an axis guide",
    ],
    docUrl: "https://ggsvelte.sh/guide/interaction-reference#interaction-inspect-x-on-col",
  },
  INTERACTION_INSPECT_X_ON_BAR: {
    severity: "advisory",
    code: "INTERACTION_INSPECT_X_ON_BAR",
    message:
      "inspect.mode draws a vertical guide through bar marks; bars already encode the band axis as a filled region, so the guide cuts the bar body and rarely adds information.",
    prop: "inspect.mode",
    suggestions: [
      'Use inspect={{ mode: "exact" }} (or leave mode as "auto") for GeomBar',
      "Prefer muteSiblings for sibling de-emphasis instead of an axis guide",
    ],
    docUrl: "https://ggsvelte.sh/guide/interaction-reference#interaction-inspect-x-on-bar",
  },
  INTERACTION_INSPECT_X_BISECTS_COL_LABELS: {
    severity: "warning",
    code: "INTERACTION_INSPECT_X_BISECTS_COL_LABELS",
    message:
      "inspect.mode draws a vertical guide through GeomCol marks that also carry GeomText/GeomLabel values; the guide bisects the on-bar totals and makes them hard to read.",
    prop: "inspect.mode",
    suggestions: [
      'Use inspect={{ mode: "exact" }} (or leave mode as "auto") when columns have value labels',
      "Keep value labels; drop the x/xy guide rather than dropping the labels",
    ],
    docUrl:
      "https://ggsvelte.sh/guide/interaction-reference#interaction-inspect-x-bisects-col-labels",
  },
  INTERACTION_INSPECT_X_BISECTS_BAR_LABELS: {
    severity: "warning",
    code: "INTERACTION_INSPECT_X_BISECTS_BAR_LABELS",
    message:
      "inspect.mode draws a vertical guide through GeomBar marks that also carry GeomText/GeomLabel values; the guide bisects the on-bar totals and makes them hard to read.",
    prop: "inspect.mode",
    suggestions: [
      'Use inspect={{ mode: "exact" }} (or leave mode as "auto") when bars have value labels',
      "Keep value labels; drop the x/xy guide rather than dropping the labels",
    ],
    docUrl:
      "https://ggsvelte.sh/guide/interaction-reference#interaction-inspect-x-bisects-bar-labels",
  },
  INTERACTION_INSPECT_HIGH_CARDINALITY_DISCRETE: {
    severity: "advisory",
    code: "INTERACTION_INSPECT_HIGH_CARDINALITY_DISCRETE",
    message:
      "Inspect is enabled with a high-cardinality discrete color/fill domain; the default tooltip shows the focused series, the largest contributors at that x (or y), a stack total, and an overflow line — not every series.",
    prop: "inspect",
    suggestions: [
      "Prep top-n data before plotting if only the largest series matter",
      "Pass a custom content snippet on <Inspect content={…} /> for a full multi-series listing",
      "Pin the tooltip to scroll the full group when every series must be readable",
    ],
    docUrl:
      "https://ggsvelte.sh/guide/interaction-reference#interaction-inspect-high-cardinality-discrete",
  },
});

/**
 * Discrete color/fill domain size that triggers the default-tooltip content
 * policy advisory when inspect is enabled (#1274).
 */
export const HIGH_CARDINALITY_DISCRETE_THRESHOLD = 16;

/** Modes that draw a vertical (x) crosshair guide in non-flipped coords. */
const X_GUIDE_MODES = new Set(["x", "xy"]);

const VALUE_LABEL_GEOMS = new Set(["text", "label", "sf_text", "sf_label"]);

/** Host inspect modes accepted by `ggsvelte-render --inspect`. */
export const INSPECT_INTENT_MODES = ["auto", "exact", "x", "y", "xy"] as const;
export type InspectIntentMode = (typeof INSPECT_INTENT_MODES)[number];

export function isInspectIntentMode(value: string): value is InspectIntentMode {
  return (INSPECT_INTENT_MODES as readonly string[]).includes(value);
}

/**
 * Advisories when inspect.mode draws an x-axis guide through bar/col marks.
 * Labels present → stronger bisect warning replaces the plain-geom advisory.
 */
export function inspectAxisOnBarColDiagnostics(
  inspectMode: string | null | undefined,
  geoms: readonly string[],
): InspectGeomAdvisory[] {
  if (inspectMode === null || inspectMode === undefined || !X_GUIDE_MODES.has(inspectMode)) {
    return [];
  }

  let hasCol = false;
  let hasBar = false;
  let hasValueLabels = false;
  for (const geom of geoms) {
    if (geom === "col") hasCol = true;
    else if (geom === "bar") hasBar = true;
    if (VALUE_LABEL_GEOMS.has(geom)) hasValueLabels = true;
  }
  if (!hasCol && !hasBar) return [];

  const list: InspectGeomAdvisory[] = [];
  if (hasCol) {
    list.push({
      ...(hasValueLabels
        ? INSPECT_GEOM_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_X_BISECTS_COL_LABELS
        : INSPECT_GEOM_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_X_ON_COL),
      actual: inspectMode,
    });
  }
  if (hasBar) {
    list.push({
      ...(hasValueLabels
        ? INSPECT_GEOM_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_X_BISECTS_BAR_LABELS
        : INSPECT_GEOM_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_X_ON_BAR),
      actual: inspectMode,
    });
  }
  return list;
}

/** Layer geom names from a PortableSpec-like layers array. */
export function layerGeomsFromSpecLayers(layers: unknown): readonly string[] {
  if (!Array.isArray(layers)) return [];
  const geoms: string[] = [];
  for (const layer of layers) {
    if (layer === null || typeof layer !== "object" || Array.isArray(layer)) continue;
    const geom = (layer as { geom?: unknown }).geom;
    if (typeof geom === "string" && geom.length > 0) geoms.push(geom);
  }
  return geoms;
}

/**
 * Headless entry: given PortableSpec layers + declared host inspect intent,
 * return the same inspect×geom codes the host fires via ondiagnostic.
 */
export function collectInspectIntentDiagnostics(
  layers: unknown,
  inspectMode: string | null | undefined,
): InspectGeomAdvisory[] {
  return inspectAxisOnBarColDiagnostics(inspectMode, layerGeomsFromSpecLayers(layers));
}

/**
 * Advisory when inspect is on and a discrete color/fill domain is large enough
 * that the default tooltip content policy (top-k + total + overflow) matters.
 *
 * `domainSizes` is the trained ordinal domain length per channel; continuous
 * ramps are omitted by the caller. Fires once per channel over the threshold.
 */
export function inspectHighCardinalityDiagnostics(input: {
  readonly inspectEnabled: boolean;
  readonly domainSizes: ReadonlyArray<{
    readonly channel: "color" | "fill";
    readonly size: number;
  }>;
  readonly threshold?: number;
}): InspectGeomAdvisory[] {
  if (!input.inspectEnabled) return [];
  const threshold = input.threshold ?? HIGH_CARDINALITY_DISCRETE_THRESHOLD;
  const list: InspectGeomAdvisory[] = [];
  for (const { channel, size } of input.domainSizes) {
    if (size < threshold) continue;
    list.push({
      ...INSPECT_GEOM_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_HIGH_CARDINALITY_DISCRETE,
      prop: channel,
      actual: size,
    });
  }
  return list;
}

/** Ordinal color/fill domain lengths from a TrainedScales-like bag. */
export function discreteColorFillDomainSizes(scales: {
  readonly color: { readonly kind: string; readonly scale: unknown } | null;
  readonly fill: { readonly kind: string; readonly scale: unknown } | null;
}): ReadonlyArray<{ readonly channel: "color" | "fill"; readonly size: number }> {
  const out: { channel: "color" | "fill"; size: number }[] = [];
  for (const channel of ["color", "fill"] as const) {
    const resolved = scales[channel];
    if (resolved === null || resolved.kind !== "ordinal") continue;
    const scale = resolved.scale;
    if (scale === null || typeof scale !== "object") continue;
    const domain = (scale as { readonly domain?: unknown }).domain;
    if (!Array.isArray(domain)) continue;
    out.push({ channel, size: domain.length });
  }
  return out;
}
