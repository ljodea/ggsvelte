/**
 * Canonical test viewport for controller-extraction suites: one shared
 * pipeline fixture so cross-suite domain/pixel assertions stay comparable.
 */
import { runPipeline, type RenderModel } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

export function modelFor(spec: PortableSpec): RenderModel {
  return runPipeline(spec, { width: 360, height: 260 });
}
