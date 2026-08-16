/**
 * Mobile On this page <details> popover: enter already uses @starting-style.
 * Exit needs discrete content-visibility on ::details-content so the card
 * stays painted for --duration-popover-exit. * does not match that pseudo.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const ROOT = join(import.meta.dir, "..");
const SHELL = join(ROOT, "apps/docs/src/styles/shell.css");
const BASE = join(ROOT, "apps/docs/src/styles/base.css");

describe("On this page popover exit", () => {
  const shell = readFileSync(SHELL, "utf8");
  const base = readFileSync(BASE, "utf8");

  it("closes ::details-content with discrete content-visibility", () => {
    expect(shell).toMatch(
      /\.docs-mobile-tools\s+details::details-content\s*\{[^}]*content-visibility\s*:\s*hidden/s,
    );
    expect(shell).toMatch(
      /\.docs-mobile-tools\s+details::details-content\s*\{[^}]*content-visibility\s+var\(--duration-popover-exit\)\s+allow-discrete/s,
    );
    expect(shell).toMatch(
      /\.docs-mobile-tools\s+details\[open\]::details-content\s*\{[^}]*content-visibility\s*:\s*visible/s,
    );
    expect(shell).toMatch(
      /\.docs-mobile-tools\s+details\[open\]::details-content\s*\{[^}]*content-visibility\s+var\(--duration-popover\)\s+allow-discrete/s,
    );
  });

  it("blocks hits on the card unless the details element is open", () => {
    expect(shell).toMatch(
      /\.docs-mobile-tools\s+details\s+\.on-this-page\s*\{[^}]*pointer-events\s*:\s*none/s,
    );
    expect(shell).toMatch(
      /\.docs-mobile-tools\s+details\[open\]\s+\.on-this-page\s*\{[^}]*pointer-events\s*:\s*auto/s,
    );
  });

  it("collapses ::details-content duration under reduced motion", () => {
    expect(base).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*::details-content\s*\{[^}]*transition-duration\s*:\s*0\.01ms/s,
    );
  });
});
