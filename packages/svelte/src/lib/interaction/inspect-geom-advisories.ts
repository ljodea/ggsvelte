/**
 * Inspect-mode × geom advisories: vertical axis guides that fight bar/col
 * geometry or bisect on-mark value labels.
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
