/**
 * Shared docs code-surface treatment (issue #696 point 2).
 *
 * Call sites used to diverge on radius, font-size, padding, and line-height.
 * One `.code-surface` rule in base.css is the source of truth for prose pre
 * blocks; CodeTabs draws its own card chrome from the same tokens.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const ROOT = join(import.meta.dir, "..");
const BASE = join(ROOT, "apps/docs/src/styles/base.css");
const TABS = join(ROOT, "apps/docs/src/lib/CodeTabs.svelte");

const SURFACE_PROPS = [
  "border-radius: var(--code-radius)",
  "padding: 1rem",
  "font-size: 0.85rem",
  "line-height: 1.6",
  "background: var(--code-paper)",
  "color: var(--code-ink)",
  "font-family: var(--code-font)",
] as const;

function styleBlock(source: string): string {
  const match = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  return match?.[1] ?? "";
}

describe("shared .code-surface in base.css (#696)", () => {
  const base = readFileSync(BASE, "utf8");

  it("defines .code-surface with the canonical host code tokens", () => {
    expect(base).toMatch(/\.code-surface\b/);
    for (const prop of SURFACE_PROPS) {
      expect(base).toMatch(
        new RegExp(
          `\\.code-surface[^{]*\\{[^}]*${prop.replaceAll(/[()]/g, "\\$&").replaceAll(": ", "\\s*:\\s*")}`,
          "s",
        ),
      );
    }
  });

  it("styles .prose pre via the shared surface (not a one-off 3px radius)", () => {
    expect(base).toMatch(/\.code-surface\s*,\s*\.prose\s+pre|\.prose\s+pre\s*,\s*\.code-surface/);
    expect(base).not.toMatch(/\.prose\s+pre\s*\{[^}]*border-radius\s*:\s*3px/s);
  });
});

describe("code-block call sites share the code tokens (#696)", () => {
  const tabs = readFileSync(TABS, "utf8");

  it("CodeTabs draws its card from the shared code tokens", () => {
    const css = styleBlock(tabs);
    // The whole tab card is the code surface: same paper/ink/radius tokens as
    // .code-surface, never a re-forked hardcoded value.
    expect(css).toMatch(/\.code-tabs[^{]*\{[^}]*border-radius\s*:\s*var\(--code-radius\)/s);
    expect(css).toMatch(/\.code-tabs[^{]*\{[^}]*background\s*:\s*var\(--code-paper\)/s);
    expect(css).toMatch(/\.code-tabs[^{]*\{[^}]*color\s*:\s*var\(--code-ink\)/s);
    // Padding must live on the scrollable pre (not only the scrollport) so
    // inline-end gap survives horizontal scroll of wide samples.
    expect(css).toMatch(/\.scroll-region[^{]*\{[^}]*padding\s*:\s*0\b/s);
    expect(css).toMatch(/pre[^{]*\{[^}]*padding\s*:\s*1rem/s);
  });
});
