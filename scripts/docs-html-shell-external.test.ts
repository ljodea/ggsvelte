/**
 * Guards for docs PR5/PR6: theme/palette shells are external files (not
 * inlined into page data), and HTML edge cache uses s-maxage.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const docsSrc = path.join(root, "apps/docs/src");

function read(rel: string): string {
  return readFileSync(path.join(docsSrc, rel), "utf8");
}

describe("docs external theme shells + HTML edge cache (PR5/PR6)", () => {
  it("loads themes and palettes from path inventory, not inlined SVG", () => {
    const themes = read("routes/themes/+page.server.ts");
    expect(themes).toContain("THEME_STATIC_SHELL_BY_ID");
    expect(themes).toContain("staticSrc");
    expect(themes).not.toContain("themeSpecimenStaticSvg");
    expect(themes).not.toContain("staticSvg:");

    const palettes = read("routes/palettes/+page.server.ts");
    expect(palettes).toContain("THEME_STATIC_SHELL_BY_ID");
    expect(palettes).toContain("staticSrc");
    expect(palettes).not.toContain("paletteSpecimenStaticSvg");
  });

  it("renders shells as img paths in ThemeSpecimen and ChartThemeLab", () => {
    const specimen = read("lib/components/ThemeSpecimen.svelte");
    expect(specimen).toContain("staticSrc");
    expect(specimen).toContain("static-shell");
    expect(specimen).not.toContain("{@html staticSvg}");

    const lab = read("lib/components/ChartThemeLab.svelte");
    expect(lab).toContain("initialStaticSrc");
    expect(lab).not.toContain("initialStaticSvg");
  });

  it("commits generated shell files under static/theme-shells", () => {
    const dir = path.join(root, "apps/docs/static/theme-shells");
    expect(existsSync(dir)).toBe(true);
    const svgs = readdirSync(dir).filter((n) => n.endsWith(".svg"));
    expect(svgs.length).toBeGreaterThan(20);
    expect(existsSync(path.join(docsSrc, "lib/generated/theme-static-shells.ts"))).toBe(true);
  });

  it("sets s-maxage on HTML and long cache on shell assets", () => {
    const headers = readFileSync(path.join(root, "apps/docs/static/_headers"), "utf8");
    expect(headers).toContain("s-maxage=600");
    expect(headers).toContain("/theme-shells/*");
    expect(headers).toContain("max-age=31536000, immutable");
  });
});
