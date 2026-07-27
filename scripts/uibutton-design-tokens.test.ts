/**
 * UiButton must honor DESIGN.md at source (issue #696):
 * - corner radius is the shared --radius token (4px host controls), not 0.5rem
 * - no decorative default box-shadows (DESIGN.md rejects heavy default shadows)
 * - playground must not patch those properties; compliance is source-level
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const ROOT = join(import.meta.dir, "..");
const UIBUTTON = join(ROOT, "apps/docs/src/lib/components/UiButton.svelte");
const PLAYGROUND = join(ROOT, "apps/docs/src/lib/Playground.svelte");
const TOKENS = join(ROOT, "apps/docs/src/styles/tokens.css");

describe("UiButton DESIGN.md radius and shadow (#696)", () => {
  const button = readFileSync(UIBUTTON, "utf8");
  const playground = readFileSync(PLAYGROUND, "utf8");
  const tokens = readFileSync(TOKENS, "utf8");

  it("tokens define --radius as 4px for ordinary host controls", () => {
    expect(tokens).toMatch(/--radius\s*:\s*4px\b/);
  });

  it("uses var(--radius) instead of a hard-coded 0.5rem (8px) radius", () => {
    expect(button).toMatch(/border-radius\s*:\s*var\(--radius\)/);
    expect(button).not.toMatch(/border-radius\s*:\s*0\.5rem/);
  });

  it("does not ship decorative default box-shadows on primary or secondary", () => {
    // Ghost may still set box-shadow: none; any non-none shadow is a DESIGN.md miss.
    const shadowDecls = [...button.matchAll(/box-shadow\s*:\s*([^;]+);/g)].map((m) => m[1]!.trim());
    expect(shadowDecls.length).toBeGreaterThan(0);
    for (const value of shadowDecls) {
      expect(value).toBe("none");
    }
  });

  it("playground does not page-patch .ui-button radius or shadow", () => {
    expect(playground).not.toMatch(/\.playground\s+:global\(\.ui-button\)\s*\{[^}]*border-radius/s);
    expect(playground).not.toMatch(/\.playground\s+:global\(\.ui-button\)\s*\{[^}]*box-shadow/s);
  });
});
