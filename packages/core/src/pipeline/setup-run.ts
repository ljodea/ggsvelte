/**
 * Pipeline run setup: normalize + validate, edition defaults, theme, coord flip.
 */
import type { PortableSpec, SpecInput } from "@ggsvelte/spec";
import { normalize, SpecValidationError, validate } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import { resolveEditionDefaults } from "../editions.js";
import type { ThemeTokens } from "../theme.js";
import { resolveTheme, UnknownThemeError } from "../theme.js";

import type { PipelineWarning, RunOptions } from "./types.js";
import { PipelineError } from "./types.js";

export interface PipelineRunSetup {
  normalized: PortableSpec;
  editionDefaults: EditionDefaults;
  theme: ThemeTokens;
  flip: boolean;
}

export function setupPipelineRun(
  spec: SpecInput | PortableSpec,
  editions: RunOptions["editions"],
  warnings: PipelineWarning[],
): PipelineRunSetup {
  // normalize + validate (normalize is idempotent; validation is cheap and
  // makes every entry point honor the agent error contract)
  const normalized = normalize(spec);
  const result = validate(normalized);
  if (!result.ok) throw new SpecValidationError(result.errors);

  // Defaults edition (Hadley lesson 13): the spec's stamped edition selects
  // the default theme table + palettes; explicit settings still win.
  const editionResolution = resolveEditionDefaults(normalized.edition, editions);
  if (editionResolution.unknownRequested !== null) {
    warnings.push({
      code: "unknown-edition",
      message:
        `The spec targets defaults edition ${editionResolution.unknownRequested}, which this ` +
        `version of ggsvelte does not know; falling back to edition ${editionResolution.edition} defaults.`,
    });
  }
  const editionDefaults = editionResolution.defaults;

  let theme: ThemeTokens;
  try {
    theme = resolveTheme(normalized.theme, editionDefaults.themes);
  } catch (error) {
    if (error instanceof UnknownThemeError) {
      throw new PipelineError("unknown-theme", "/theme", error.message);
    }
    throw error;
  }

  return {
    normalized,
    editionDefaults,
    theme,
    flip: normalized.coord?.type === "flip",
  };
}
