/**
 * Non-identity stat branches for LayerFrame construction.
 * Returns null for identity so the caller can fall through.
 *
 * Builders are registered by {@link registerAllStatFrames} (full package) or
 * left empty on the lean `@ggsvelte/core/render` entry so identity charts do
 * not pull loess/density/sf modules into the client graph.
 */
import type { ColumnTable } from "../table.js";

import { getStatFrameBuilder } from "./frame-stats-registry.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

export function buildNonIdentityFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
  advisories: Advisory[],
  binRange?: [number, number],
  functionDomain?: [number, number],
): LayerFrame | null {
  const stat = binding.layer.stat ?? "identity";
  if (stat === "identity") return null;

  const build = getStatFrameBuilder(stat);
  if (build === undefined) {
    const path = `/layers/${String(binding.index)}/stat`;
    throw new PipelineError(
      "unsupported-param",
      path,
      `Stat "${stat}" is not registered in this build. Import @ggsvelte/core (full package) rather than @ggsvelte/core/render, or call registerStatFrame("${stat}", …).`,
    );
  }
  return build(binding, table, groups, warnings, advisories, binRange, functionDomain);
}
