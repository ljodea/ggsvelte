import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";

import { THEME_NAME_ALIASES, THEME_NAMES } from "../packages/spec/src/schema.ts";

const APP_CSS = new URL("../apps/docs/src/app.css", import.meta.url);
const THEME_EVIDENCE = new URL("../artifacts/theme-equivalence/", import.meta.url);
const THEME_EVIDENCE_GENERATOR = new URL("./render-theme-evidence.ts", import.meta.url);

describe("documentation chart theme isolation", () => {
  it("does not set chart fallback variables from the site appearance", async () => {
    const css = await readFile(APP_CSS, "utf8");

    expect(css).not.toMatch(
      /--gg-(?:ink|paper|panel|grid|accent|axisText|axisLine|tickColor|panelBorder)\s*:/,
    );
  });

  it("keeps rendered evidence for every registered theme", async () => {
    // Aliases (grey/gray → ggplot2) reuse the canonical theme's evidence files
    // rather than committing duplicate 1440×960 PNGs (#824).
    for (const theme of THEME_NAMES) {
      const evidence =
        theme in THEME_NAME_ALIASES
          ? THEME_NAME_ALIASES[theme as keyof typeof THEME_NAME_ALIASES]
          : theme;
      expect(await Bun.file(new URL(`svg/${evidence}.svg`, THEME_EVIDENCE)).exists()).toBe(true);
      expect(await Bun.file(new URL(`ggsvelte-${evidence}.png`, THEME_EVIDENCE)).exists()).toBe(
        true,
      );
    }
  });

  it("evidence generator skips THEME_NAME_ALIASES so refresh does not re-create duplicates", async () => {
    const src = await readFile(THEME_EVIDENCE_GENERATOR, "utf8");
    expect(src).toContain("THEME_NAME_ALIASES");
    expect(src).toMatch(/THEME_NAMES\.filter\(\(theme\) => !\(theme in THEME_NAME_ALIASES\)\)/);
  });
});
