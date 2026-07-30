/**
 * Guards: marketing / multi-specimen docs pages must not auto-import the
 * chart stack on mount. Intent (hover/focus/click) upgrades static shells.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const docsSrc = path.join(root, "apps/docs/src");

function read(rel: string): string {
  return readFileSync(path.join(docsSrc, rel), "utf8");
}

describe("docs chart intent-gated load", () => {
  it("homepage has no live chart stack import on the hero", () => {
    const page = read("routes/+page.svelte");
    // Title + featured examples only — no Guerry hero plot or HomeHeroPlot.
    expect(page).not.toContain("heroStaticSvg");
    expect(page).not.toContain("HomeHeroPlot");
    expect(page).not.toMatch(/onMount\s*\(/);
  });

  it("loads GrammarDemoPlot only after user intent", () => {
    const demo = read("lib/components/GrammarDemo.svelte");
    expect(demo).toContain("observeUserIntent");
    expect(demo).toContain("ensureLive");
    expect(demo).not.toMatch(/onMount\(\s*\(\)\s*=>\s*\{\s*void import/);
  });

  it("loads ChartThemeLab and ThemeSpecimen only after user intent", () => {
    const lab = read("lib/components/ChartThemeLab.svelte");
    expect(lab).toContain("observeUserIntent");
    expect(lab).toContain("ensureLive");
    // Must not start the TemperaturesSpecimen import from onMount itself.
    expect(lab).toMatch(/onMount\(\(\) => \{\s*const el = host/);

    const specimen = read("lib/components/ThemeSpecimen.svelte");
    expect(specimen).toContain("observeUserIntent");
    expect(specimen).not.toContain("observeNearViewport");
    expect(specimen).not.toContain("eager");
  });

  it("loads palette/sequential plots only after user intent", () => {
    const palette = read("lib/components/PaletteSpecimen.svelte");
    expect(palette).toContain("observeUserIntent");
    expect(palette).not.toContain("observeNearViewport");

    const sequential = read("lib/components/SequentialDeferredPlot.svelte");
    expect(sequential).toContain("observeUserIntent");
    expect(sequential).not.toContain("observeNearViewport");
  });
});
