import type { RenderModel } from "@ggsvelte/core";
import type { PortableSpec, Scales } from "@ggsvelte/spec";

import type { InteractionSource, ZoomEvent } from "./interaction.js";
import {
  frozenZoomDomains,
  panelDataDomains,
  type ContinuousZoomDomains,
  type PanelBounds,
  type PlotRect,
} from "./plot-geometry.js";

export type ZoomMode = "x" | "y" | "xy";

const zoomScale = (
  config: Scales["x"] | undefined,
  domain: [number, number],
): NonNullable<Scales["x"]> => ({
  ...config,
  domain: [domain[0], domain[1]],
  nice: false,
});

/**
 * Restrict controller/shared zoom domains to channels this plot opted into.
 *
 * - `mode === null`: plot has no local zoom tool; still apply every controller
 *   domain present (linked display without publishing zoom tools).
 * - `mode === "x" | "y" | "xy"`: drop channels the plot did not opt into so an
 *   x-only plot cannot be rescaled by a shared y domain.
 *
 * Returns null when nothing remains to apply.
 */
export function filterZoomDomainsByMode(
  domains:
    | ContinuousZoomDomains
    | null
    | Readonly<{
        x?: readonly [number, number];
        y?: readonly [number, number];
      }>,
  mode: ZoomMode | null,
): ContinuousZoomDomains | null {
  if (domains === null) return null;
  const takeX = mode === null || mode !== "y";
  const takeY = mode === null || mode !== "x";
  const next: ContinuousZoomDomains = {
    ...(takeX &&
      domains.x !== undefined && {
        x: [domains.x[0], domains.x[1]] as [number, number],
      }),
    ...(takeY &&
      domains.y !== undefined && {
        y: [domains.y[0], domains.y[1]] as [number, number],
      }),
  };
  if (next.x === undefined && next.y === undefined) return null;
  return next;
}

function sameZoomChannel(
  a: readonly [number, number] | undefined,
  b: readonly [number, number] | undefined,
): boolean {
  return (
    a === b ||
    (a !== undefined && b !== undefined && Object.is(a[0], b[0]) && Object.is(a[1], b[1]))
  );
}

/** Value equality for continuous zoom domain bags (Object.is per endpoint). */
export function sameZoomDomains(
  left: ContinuousZoomDomains | null | undefined,
  right: ContinuousZoomDomains | null | undefined,
): boolean {
  if (left === right) return true;
  if (left === null || left === undefined || right === null || right === undefined) {
    return (left === null || left === undefined) && (right === null || right === undefined);
  }
  return sameZoomChannel(left.x, right.x) && sameZoomChannel(left.y, right.y);
}

/**
 * Prefer the previous domain bag when values match so `$derived` identity stays
 * stable across controller revisions that only change selection/emphasis.
 */
export function stableZoomDomains(
  previous: ContinuousZoomDomains | null,
  next: ContinuousZoomDomains | null,
): ContinuousZoomDomains | null {
  return sameZoomDomains(previous, next) ? previous : next;
}

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
 * Build a frozen zoom event payload.
 * Phase is "clear" when domains is null. Non-null domains are re-frozen via
 * `frozenZoomDomains` so nested tuples are cloned (not merely wrapper-frozen).
 */
export function buildZoomEvent(
  domains: ContinuousZoomDomains | null,
  source: InteractionSource,
): ZoomEvent {
  return Object.freeze({
    type: "zoom",
    phase: domains === null ? "clear" : "end",
    source,
    domains: domains === null ? null : frozenZoomDomains(domains),
  });
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
