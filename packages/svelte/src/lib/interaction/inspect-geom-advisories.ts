/**
 * Inspect-mode × geom advisories: vertical axis guides that fight bar/col
 * geometry or bisect on-mark value labels, plus high-cardinality discrete
 * color/fill + inspect (#1274).
 *
 * Pure collection — plot-engine delivers once per code:prop when inspect.mode
 * is explicit x/xy and the assembled layers include bar/col (and optionally
 * text/label). Auto/exact modes never fire: auto already picks exact for
 * bar/col (candidateAutoMode).
 */
import {
  INTERACTION_DIAGNOSTIC_CATALOG,
  type InteractionDiagnostic,
} from "./interaction-diagnostics.js";

/**
 * Discrete color/fill domain size that triggers the default-tooltip content
 * policy advisory when inspect is enabled (#1274).
 */
export const HIGH_CARDINALITY_DISCRETE_THRESHOLD = 16;

/** Modes that draw a vertical (x) crosshair guide in non-flipped coords. */
const X_GUIDE_MODES = new Set(["x", "xy"]);

const VALUE_LABEL_GEOMS = new Set(["text", "label", "sf_text", "sf_label"]);

/**
 * Advisories when inspect.mode draws an x-axis guide through bar/col marks.
 * Labels present → stronger bisect warning replaces the plain-geom advisory.
 */
export function inspectAxisOnBarColDiagnostics(
  inspectMode: string | null | undefined,
  geoms: readonly string[],
): InteractionDiagnostic[] {
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

  const list: InteractionDiagnostic[] = [];
  if (hasCol) {
    list.push({
      ...(hasValueLabels
        ? INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_X_BISECTS_COL_LABELS
        : INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_X_ON_COL),
      actual: inspectMode,
    });
  }
  if (hasBar) {
    list.push({
      ...(hasValueLabels
        ? INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_X_BISECTS_BAR_LABELS
        : INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_X_ON_BAR),
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
}): InteractionDiagnostic[] {
  if (!input.inspectEnabled) return [];
  const threshold = input.threshold ?? HIGH_CARDINALITY_DISCRETE_THRESHOLD;
  const list: InteractionDiagnostic[] = [];
  for (const { channel, size } of input.domainSizes) {
    if (size < threshold) continue;
    list.push({
      ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INSPECT_HIGH_CARDINALITY_DISCRETE,
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
