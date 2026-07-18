/**
 * renderToSVGString — the synchronous, DOM-free, deterministic renderer
 * (pure entry; safe in Node/edge/workers).
 *
 * - Forces SVG for every layer and takes a `maxMarks` safety limit
 *   (default 100_000) so agent/CLI calls cannot OOM a server.
 * - Deterministic: same spec + same RunOptions (same measurer) => byte-
 *   identical output. No Date.now, no randomness, run ids never serialize.
 * - Theme-ables ride `--gg-*` CSS custom properties with the resolved theme
 *   role as fallback (`var(--gg-ink, currentColor)`) — the default theme's
 *   currentColor behavior is preserved; data-mapped colors are literal
 *   palette values.
 * - Renderer failures are STRUCTURED (PipelineError "renderer-failure"),
 *   never a blank string (failure policy).
 * - A11y basics: role="img", aria-label, <title>.
 *
 * The Svelte adapter mirrors this structure with real markup (same Scene,
 * same class names) — keep the two in sync.
 *
 * Implementation split:
 * - render-svg-format.ts — px / escapeXML
 * - render-svg-marks.ts — countMarks, pathData, batch emitters
 * - render-svg-scene.ts — chrome + sceneLabel + sceneToSVGString
 */
import type { GGBuilder, SpecInput } from "@ggsvelte/spec";

import type { RenderModel, RunOptions } from "./pipeline.js";
import { PipelineError, runPipeline } from "./pipeline.js";
import { countMarks } from "./render-svg-marks.js";
import { sceneToSVGString } from "./render-svg-scene.js";

export { countMarks, pathData } from "./render-svg-marks.js";
export { sceneLabel, sceneToSVGString } from "./render-svg-scene.js";

export interface RenderSVGOptions extends Omit<RunOptions, "height"> {
  /** Plot height in px (default 400). */
  height?: number;
  /** Refuse to render more marks than this (default 100_000). */
  maxMarks?: number;
}

const DEFAULT_HEIGHT = 400;
const DEFAULT_MAX_MARKS = 100_000;

function isBuilder(spec: SpecInput | GGBuilder): spec is GGBuilder {
  return typeof (spec as GGBuilder).spec === "function";
}

/**
 * Render a spec (or builder) to a standalone SVG string. Synchronous,
 * DOM-free, deterministic (per measurer). All layers render as SVG.
 */
export function renderToSVGString(spec: SpecInput | GGBuilder, options: RenderSVGOptions): string {
  const resolved: SpecInput = isBuilder(spec) ? spec.spec() : spec;
  const { maxMarks, height, ...run } = options;
  const model: RenderModel = runPipeline(resolved, {
    ...run,
    height: height ?? resolved.height ?? DEFAULT_HEIGHT,
  });
  const limit = maxMarks ?? DEFAULT_MAX_MARKS;
  const marks = countMarks(model.scene);
  if (marks > limit) {
    throw new PipelineError(
      "max-marks-exceeded",
      "/layers",
      `The plot renders ${marks} marks, more than maxMarks (${limit}). ` +
        "Raise maxMarks explicitly or reduce the data.",
    );
  }
  try {
    return sceneToSVGString(model.scene);
  } catch (error) {
    // Failure policy: renderer errors are structured, never blank output.
    throw new PipelineError(
      "renderer-failure",
      "",
      `The SVG renderer failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
