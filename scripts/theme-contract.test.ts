import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";

import { THEME_NAMES } from "../packages/spec/src/schema.ts";

const APP_CSS = new URL("../apps/docs/src/app.css", import.meta.url);
const THEME_EVIDENCE = new URL("../artifacts/theme-equivalence/", import.meta.url);

describe("documentation chart theme isolation", () => {
  it("does not set chart fallback variables from the site appearance", async () => {
    const css = await readFile(APP_CSS, "utf8");

    expect(css).not.toMatch(
      /--gg-(?:ink|paper|panel|grid|accent|axisText|axisLine|tickColor|panelBorder)\s*:/,
    );
  });

  it("keeps rendered evidence for every registered theme", async () => {
    for (const theme of THEME_NAMES) {
      expect(await Bun.file(new URL(`svg/${theme}.svg`, THEME_EVIDENCE)).exists()).toBe(true);
      expect(await Bun.file(new URL(`ggsvelte-${theme}.png`, THEME_EVIDENCE)).exists()).toBe(true);
    }
  });
});
