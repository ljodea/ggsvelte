/**
 * Shared docs code-surface treatment (issue #696 point 2).
 *
 * Call sites used to diverge on radius, font-size, padding, and line-height.
 * One `.code-surface` rule in base.css is the source of truth; remaining
 * sites must use it instead of re-stating surface tokens.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const ROOT = join(import.meta.dir, "..");
const BASE = join(ROOT, "apps/docs/src/styles/base.css");
const TABS = join(ROOT, "apps/docs/src/lib/CodeTabs.svelte");

const SURFACE_PROPS = [
  "border-radius: var(--radius)",
  "padding: 1rem",
  "font-size: 0.8rem",
  "line-height: 1.5",
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

describe("code-block call sites use .code-surface (#696)", () => {
  const tabs = readFileSync(TABS, "utf8");

  it("CodeTabs scroll region applies code-surface and inherits type from it", () => {
    expect(tabs).toMatch(/class="[^"]*\bcode-surface\b[^"]*"/);
    const css = styleBlock(tabs);
    // Surface type/ink come from .code-surface; do not re-fork font-size or paper.
    expect(css).not.toMatch(/font-size\s*:\s*0\.8rem/);
    expect(css).not.toMatch(/\.scroll-region[^{]*\{[^}]*background\s*:\s*var\(--code-paper\)/s);
    // Padding must live on the scrollable pre (not only the scrollport) so
    // inline-end gap survives horizontal scroll of wide samples.
    expect(css).toMatch(/\.scroll-region[^{]*\{[^}]*padding\s*:\s*0\b/s);
    expect(css).toMatch(/pre[^{]*\{[^}]*padding\s*:\s*1rem/s);
  });
});
