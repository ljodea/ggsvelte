import type { RenderModel } from "@ggsvelte/core";
import type { PortableSpec, Scales } from "@ggsvelte/spec";

import {
  panelDataDomains,
  type ContinuousZoomDomains,
  type PanelBounds,
  type PlotRect,
} from "./plot-geometry.js";

export type ZoomMode = "x" | "y" | "xy";

const zoomScale = (
  config: Scales["x"] | undefined,
  domain: [number, number],
): NonNullable<Scales["x"]> =>
  ({
    ...config,
    domain: [domain[0], domain[1]],
    nice: false,
  }) as NonNullable<Scales["x"]>;

/**
 * Merge continuous zoom domains into a portable spec's scales.
 * Returns `spec` by reference when domains are null/empty so callers can
 * keep `$derived` identity stable and avoid pipeline re-runs.
 */
export function applyZoomToSpec(
  spec: PortableSpec,
  domains: ContinuousZoomDomains | null,
): PortableSpec {
  if (domains === null || (domains.x === undefined && domains.y === undefined)) return spec;
  return {
    ...spec,
    scales: {
      ...spec.scales,
      ...(domains.x !== undefined && {
        x: zoomScale(spec.scales?.x, domains.x),
      }),
      ...(domains.y !== undefined && {
        y: zoomScale(spec.scales?.y, domains.y),
      }),
    },
  };
}

/**
 * Apply a partial programmatic zoom update, dropping band/non-finite channels.
 * Returns null when no valid domain remains (callers emit no zoom event).
 */
export function sanitizePartialZoomDomains(
  partial: Partial<ContinuousZoomDomains>,
  scales: Pick<RenderModel["scales"], "x" | "y"> | undefined,
  current: ContinuousZoomDomains | null,
): ContinuousZoomDomains | null {
  const next: ContinuousZoomDomains = { ...current };
  for (const channel of ["x", "y"] as const) {
    const domain = partial[channel];
    if (domain === undefined) continue;
    const scale = scales?.[channel];
    if (
      scale?.type === "band" ||
      domain.length !== 2 ||
      !domain.every((value) => Number.isFinite(value))
    )
      continue;
    next[channel] = [domain[0], domain[1]];
  }
  if (next.x === undefined && next.y === undefined) return null;
  return next;
}

/**
 * Invert a brush rect into continuous zoom domains for the given mode.
 * Degeneracy uses *raw* (pre-flip) normalized pixel spans and rejects only
 * when both spans are non-positive — single-axis-thin brushes still produce
 * a domain on the remaining axis (existing M2 behavior).
 */
export function resolveBrushZoomDomains(
  rect: PlotRect,
  panel: PanelBounds,
  scales: Pick<RenderModel["scales"], "x" | "y">,
  flipped: boolean,
  mode: ZoomMode,
  current: ContinuousZoomDomains | null,
): ContinuousZoomDomains | null {
  const th0 = Math.max(0, Math.min(1, (rect.x0 - panel.x) / panel.width));
  const th1 = Math.max(0, Math.min(1, (rect.x1 - panel.x) / panel.width));
  const tv0 = Math.max(0, Math.min(1, 1 - (rect.y1 - panel.y) / panel.height));
  const tv1 = Math.max(0, Math.min(1, 1 - (rect.y0 - panel.y) / panel.height));
  // Guard uses raw screen fractions, not flip-remapped domains.
  if (th1 - th0 <= 0 && tv1 - tv0 <= 0) return null;
  const inverted = panelDataDomains(rect, panel, scales, flipped);
  const next: ContinuousZoomDomains = { ...current };
  if (mode !== "y" && inverted.x !== undefined) next.x = inverted.x;
  if (mode !== "x" && inverted.y !== undefined) next.y = inverted.y;
  if (next.x === undefined && next.y === undefined) return null;
  return next;
}
