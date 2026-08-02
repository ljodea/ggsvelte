/**
 * Canonical test viewport for controller-extraction suites: one shared
 * pipeline fixture so cross-suite domain/pixel assertions stay comparable.
 */
import { registerAll, runPipeline, type RenderModel } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

// Spec-driven test helper: no <Geom*> components in this path to
// self-register specialty geoms/stats (#1420), so opt into the full grammar.
registerAll();

export function modelFor(spec: PortableSpec): RenderModel {
  return runPipeline(spec, { width: 360, height: 260 });
}
