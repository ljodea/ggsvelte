/**
 * Docs chrome press scale must match copy buttons and apply on desktop.
 * The shared shell rules must sit outside @media (max-width: 74.99rem).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const ROOT = join(import.meta.dir, "..");
const SHELL = join(ROOT, "apps/docs/src/styles/shell.css");
const SEARCH = join(ROOT, "apps/docs/src/lib/components/SiteSearch.svelte");
const GRAMMAR = join(ROOT, "apps/docs/src/lib/components/GrammarDemo.svelte");
const EXAMPLE = join(ROOT, "apps/docs/src/lib/components/ExampleLiveFrame.svelte");

const PRESS_TRANSITION = /transition:\s*transform\s+var\(--duration-press\)\s+var\(--ease-out\)/;
const PRESS_SCALE = /:active[^{]*\{[^}]*transform:\s*scale\(0\.97\)/s;

function styleBlock(source: string): string {
  const match = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  return match?.[1] ?? "";
}

describe("docs chrome press scale", () => {
  const shell = readFileSync(SHELL, "utf8");
  const media = shell.indexOf("@media (max-width: 74.99rem)");

  it("defines desktop-visible chrome press before the mobile docs media query", () => {
    const group = shell.indexOf(".search-trigger,");
    expect(group).toBeGreaterThan(-1);
    expect(media).toBeGreaterThan(-1);
    expect(group).toBeLessThan(media);
    const head = shell.slice(group, media);
    expect(head).toMatch(PRESS_TRANSITION);
    expect(head).toMatch(/\.appearance/);
    expect(head).toMatch(/\.menu-trigger/);
    expect(head).toMatch(/\.mobile-search-trigger/);
    expect(head).toMatch(/\.site-menu__heading button/);
    expect(head).toMatch(/\.chapter-dialog__heading button/);
    expect(head).toMatch(/\.docs-mobile-tools > button/);
    expect(head).toMatch(/\.docs-mobile-tools summary/);
    expect(head).toMatch(/:active/);
    expect(head).toMatch(/transform:\s*scale\(0\.97\)/);
  });

  it("search close button presses", () => {
    const css = styleBlock(readFileSync(SEARCH, "utf8"));
    expect(css).toMatch(/header button[^{]*\{[^}]*transform\s+var\(--duration-press\)/s);
    expect(css).toMatch(PRESS_SCALE);
  });

  it("load-interactive buttons press unless aria-disabled", () => {
    for (const path of [GRAMMAR, EXAMPLE]) {
      const css = styleBlock(readFileSync(path, "utf8"));
      expect(css).toMatch(/\.load-interactive[^{]*\{[^}]*transform\s+var\(--duration-press\)/s);
      expect(css).toMatch(
        /\.load-interactive:active:not\(\[aria-disabled="true"\]\)[^{]*\{[^}]*scale\(0\.97\)/s,
      );
    }
  });
});
