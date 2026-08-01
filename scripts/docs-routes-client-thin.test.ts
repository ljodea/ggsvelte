/**
 * Guards: client shell must not pull the full DOCS_ROUTES catalog (~120KB).
 * Server layout load already serializes the current route; chrome only needs
 * GUIDE_NAVIGATION + primaryNavigationOwner.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const docsSrc = path.join(root, "apps/docs/src");

function read(rel: string): string {
  return readFileSync(path.join(docsSrc, rel), "utf8");
}

describe("docs routes client thin catalog", () => {
  it("keeps routes-nav free of DOCS_ROUTES value imports", () => {
    const nav = read("lib/routes-nav.ts");
    expect(nav).toContain("GUIDE_NAVIGATION");
    expect(nav).toContain("primaryNavigationOwner");
    // Comments may name DOCS_ROUTES; ban value imports only.
    expect(nav).not.toMatch(/import\s*\{[^}]*\bDOCS_ROUTES\b[^}]*\}\s*from/);
    expect(nav).not.toMatch(/findDocsRoute|guideSequence|sitemapRoutes/);
  });

  it("loads GUIDE_NAVIGATION from its own generated module, not routes.ts", () => {
    // Same ESM module as DOCS_ROUTES forced the full ~120KB catalog into every
    // layout client chunk (routes-nav only needs the sidebar map).
    const nav = read("lib/routes-nav.ts");
    expect(nav).toMatch(/from\s*["']\.\/generated\/guide-navigation(?:\.js)?["']/);
    expect(nav).not.toMatch(/from\s*["']\.\/generated\/routes(?:\.js)?["']/);

    const guideNav = read("lib/generated/guide-navigation.ts");
    expect(guideNav).toContain("export const GUIDE_NAVIGATION");
    expect(guideNav).not.toContain("DOCS_ROUTES");

    const routesGen = read("lib/generated/routes.ts");
    expect(routesGen).toContain("export const DOCS_ROUTES");
    expect(routesGen).not.toContain("GUIDE_NAVIGATION");
  });

  it("loads DocsShell and SiteHeader from routes-nav, not the full routes module", () => {
    const shell = read("lib/components/DocsShell.svelte");
    expect(shell).toContain("$lib/routes-nav");
    expect(shell).not.toMatch(/from\s*["']\$lib\/routes["']/);

    const header = read("lib/components/SiteHeader.svelte");
    expect(header).toContain("$lib/routes-nav");
    expect(header).not.toMatch(/from\s*["']\$lib\/routes["']/);
  });

  it("loads docs overview chapters from routes-nav", () => {
    const page = read("routes/docs/+page.svelte");
    expect(page).toContain("$lib/routes-nav");
    expect(page).not.toMatch(/from\s*["']\$lib\/routes["']/);
  });

  it("keeps full route helpers on the server-facing routes module", () => {
    const routes = read("lib/routes.ts");
    expect(routes).toContain("DOCS_ROUTES");
    expect(routes).toContain("findDocsRoute");
    expect(routes).toContain("guideSequence");
  });
});
