/**
 * Shared docs code-surface treatment (issue #696 point 2).
 *
 * Four call sites used to diverge on radius (0/3px/4px), font-size
 * (0.7/0.75/0.8rem), padding (0.65rem/1rem), and line-height (1.45/1.5/1.55).
 * One `.code-surface` rule in base.css is the source of truth; the four sites
 * must use it instead of re-stating surface tokens.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const ROOT = join(import.meta.dir, "..");
const BASE = join(ROOT, "apps/docs/src/styles/base.css");
const EVENTS = join(ROOT, "apps/docs/src/lib/components/PlaygroundEvents.svelte");
const PROMPT = join(ROOT, "apps/docs/src/lib/components/PlaygroundPrompt.svelte");
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
    // Selector group must include .code-surface so all four sites share one rule.
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
    // .prose pre must be co-selected with .code-surface or be a pure margin wrapper.
    expect(base).toMatch(/\.code-surface\s*,\s*\.prose\s+pre|\.prose\s+pre\s*,\s*\.code-surface/);
    expect(base).not.toMatch(/\.prose\s+pre\s*\{[^}]*border-radius\s*:\s*3px/s);
  });
});

describe("four code-block call sites use .code-surface (#696)", () => {
  const events = readFileSync(EVENTS, "utf8");
  const prompt = readFileSync(PROMPT, "utf8");
  const tabs = readFileSync(TABS, "utf8");

  it("PlaygroundEvents applies code-surface and does not restate surface tokens", () => {
    expect(events).toMatch(/class="[^"]*\bcode-surface\b[^"]*"/);
    const css = styleBlock(events);
    // Only the event JSON pre rule — summary chrome may use other sizes.
    expect(css).toMatch(/pre\s*\{[^}]*max-height/s);
    expect(css).not.toMatch(/pre\s*\{[^}]*border-radius\s*:/s);
    expect(css).not.toMatch(/pre\s*\{[^}]*background\s*:\s*var\(--code-paper\)/s);
    expect(css).not.toMatch(/pre\s*\{[^}]*font(?:-size)?\s*:\s*0\.7rem/s);
    expect(css).not.toMatch(/pre\s*\{[^}]*padding\s*:\s*0\.65rem/s);
  });

  it("PlaygroundPrompt details pre applies code-surface and does not restate surface tokens", () => {
    expect(prompt).toMatch(/class="[^"]*\bcode-surface\b[^"]*"/);
    const css = styleBlock(prompt);
    // Layout-only extras (max-height, margin, white-space) are fine; surface tokens are not.
    expect(css).not.toMatch(/\.details-pre[^{]*\{[^}]*border-radius\s*:/s);
    expect(css).not.toMatch(/\.details-pre[^{]*\{[^}]*background\s*:\s*var\(--code-paper\)/s);
    expect(css).not.toMatch(/\.details-pre[^{]*\{[^}]*font\s*:\s*0\.75rem/s);
    expect(css).not.toMatch(/\.details-pre[^{]*\{[^}]*padding\s*:\s*0\.65rem/s);
  });

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
