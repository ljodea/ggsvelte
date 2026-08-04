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
    // Static SVG has no tab stops — button is the keyboard wake path.
    expect(demo).toContain("Load interactive chart");
    // Restore focus into the plot after the load button unmounts (#1362).
    expect(demo).toContain("restoreKeyboardFocus");
    expect(demo).toContain("focusAfterUpgrade");
    expect(demo).toContain(".gg-capture");
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

  it("loads the single shared palette preview eagerly; sequential plots stay intent-gated", () => {
    // One chart anchor per page: the 48-specimen gallery (whose intent gate
    // existed because dozens of chart imports locked SPA nav) is gone, so
    // PalettePreview deliberately imports its live chart from onMount.
    const preview = read("lib/components/PalettePreview.svelte");
    expect(preview).toContain('void import("./PaletteSpecimenLive.svelte")');
    expect(preview).not.toContain("observeUserIntent");

    // Index rows render without any chart-stack import.
    const index = read("lib/components/PaletteIndex.svelte");
    expect(index).not.toMatch(/import\s*\(/);
    expect(index).not.toContain("PaletteSpecimenLive");

    const sequential = read("lib/components/SequentialDeferredPlot.svelte");
    expect(sequential).toContain("observeUserIntent");
    expect(sequential).not.toContain("observeNearViewport");
  });

  it("loads example and lesson live charts only after user intent", () => {
    const frame = read("lib/components/ExampleLiveFrame.svelte");
    expect(frame).toContain("observeUserIntent");
    expect(frame).not.toContain("observeNearViewport");

    const lesson = read("lib/components/LessonFinishedChart.svelte");
    expect(lesson).toContain("observeUserIntent");
    expect(lesson).not.toContain("observeNearViewport");
  });

  it("restores keyboard focus into the lesson plot after upgrade (#1362)", () => {
    const lesson = read("lib/components/LessonFinishedChart.svelte");
    expect(lesson).toContain("restoreKeyboardFocus");
    expect(lesson).toContain("focusAfterUpgrade");
    expect(lesson).toContain(".gg-capture");
    expect(lesson).toContain("gg-plot-root");
    expect(lesson).toContain("onfocusout");
    expect(lesson).toMatch(/\.focus\(/);
  });
});
