/**
 * Resolve defaults edition for a pipeline run (with unknown-edition warning).
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import { resolveEditionDefaults } from "../editions.js";

import type { PipelineWarning, RunOptions } from "./types.js";

export function resolvePipelineEditionDefaults(
  edition: PortableSpec["edition"],
  editions: RunOptions["editions"],
  warnings: PipelineWarning[],
): EditionDefaults {
  const editionResolution = resolveEditionDefaults(edition, editions);
  if (editionResolution.unknownRequested !== null) {
    warnings.push({
      code: "unknown-edition",
      message:
        `The spec targets defaults edition ${editionResolution.unknownRequested}, which this ` +
        `version of ggsvelte does not know; falling back to edition ${editionResolution.edition} defaults.`,
    });
  }
  return editionResolution.defaults;
}
