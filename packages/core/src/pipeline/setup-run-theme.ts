/**
 * Resolve theme tokens for a pipeline run (structured unknown-theme errors).
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import type { ThemeTokens } from "../theme.js";
import { resolveTheme, UnknownThemeError } from "../theme.js";

import { PipelineError } from "./types.js";

export function resolvePipelineTheme(
  themeSpec: PortableSpec["theme"],
  editionDefaults: EditionDefaults,
): ThemeTokens {
  try {
    return resolveTheme(themeSpec, editionDefaults.themes);
  } catch (error) {
    if (error instanceof UnknownThemeError) {
      throw new PipelineError("unknown-theme", "/theme", error.message);
    }
    throw error;
  }
}
