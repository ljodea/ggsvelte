/**
 * Click-opened search is a centered modal on wide viewports and opacity-only
 * on the full-viewport mobile dialog. Tokens and discrete display must exist.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const ROOT = join(import.meta.dir, "..");
const TOKENS = join(ROOT, "apps/docs/src/styles/tokens.css");
const SEARCH = join(ROOT, "apps/docs/src/lib/components/SiteSearch.svelte");
const DESIGN = join(ROOT, "DESIGN.md");

function styleBlock(source: string): string {
  const match = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  return match?.[1] ?? "";
}

describe("search dialog motion", () => {
  const tokens = readFileSync(TOKENS, "utf8");
  const css = styleBlock(readFileSync(SEARCH, "utf8"));
  const design = readFileSync(DESIGN, "utf8");

  it("defines modal enter/exit duration tokens", () => {
    expect(tokens).toMatch(/--duration-modal-enter\s*:\s*200ms/);
    expect(tokens).toMatch(/--duration-modal-exit\s*:\s*150ms/);
  });

  it("opens the wide dialog from center scale 0.97 with discrete display", () => {
    const head = css.slice(0, css.indexOf("@media (max-width: 40rem)"));
    expect(head).toMatch(/\.site-search\s*\{[^}]*transform:\s*scale\(0\.97\)/s);
    expect(head).toMatch(/\.site-search\s*\{[^}]*transform-origin:\s*center/s);
    expect(head).toMatch(/\.site-search\[open\]\s*\{[^}]*transform:\s*scale\(1\)/s);
    expect(head).toMatch(
      /\.site-search\s*\{[^}]*display\s+var\(--duration-modal-exit\)\s+allow-discrete/s,
    );
    expect(head).toMatch(/\.site-search::backdrop\s*\{[^}]*opacity:\s*0/s);
    expect(head).toMatch(/\.site-search\[open\]::backdrop\s*\{[^}]*opacity:\s*1/s);
  });

  it("uses opacity-only motion on the full-viewport dialog", () => {
    const mobile = css.slice(css.indexOf("@media (max-width: 40rem)"));
    expect(mobile).toMatch(/\.site-search\s*\{[^}]*transform:\s*none/s);
    expect(mobile).not.toMatch(/scale\(0\.97\)/);
  });

  it("names click-opened search in the DESIGN.md motion allowlist", () => {
    expect(design).toMatch(/click-opened search/i);
    expect(design).toMatch(/full-viewport/);
  });
});
