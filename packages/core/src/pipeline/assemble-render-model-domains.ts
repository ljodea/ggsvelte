/**
 * Freeze RenderModel domain and warning/advisory surfaces.
 */
import type { Advisory, PipelineWarning, RenderModel, ScaleDomainSnapshot } from "./types.js";
import { dedupeAdvisories, dedupeWarnings } from "./layout-helpers.js";

export function freezeRenderModelDomains(
  baseline: ScaleDomainSnapshot,
  effective: ScaleDomainSnapshot,
): RenderModel["domains"] {
  return Object.freeze({ baseline, effective });
}

export function dedupeRenderModelDiagnostics(
  warnings: PipelineWarning[],
  advisories: Advisory[],
): { warnings: PipelineWarning[]; advisories: Advisory[] } {
  return {
    warnings: dedupeWarnings(warnings),
    advisories: dedupeAdvisories(advisories),
  };
}
