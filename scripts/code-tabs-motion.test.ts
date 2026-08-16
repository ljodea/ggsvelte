/**
 * CodeTabs tab triggers must snap selected wash (keyboard list nav).
 * Press scale may still transition transform.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const TABS = join(import.meta.dir, "../apps/docs/src/lib/CodeTabs.svelte");

function styleBlock(source: string): string {
  const match = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  return match?.[1] ?? "";
}

function ruleBody(css: string, selector: string): string {
  const escaped = selector.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  return match?.[1] ?? "";
}

describe("CodeTabs tab motion", () => {
  const css = styleBlock(readFileSync(TABS, "utf8"));

  it("tab buttons transition transform only so selected wash snaps", () => {
    const body = ruleBody(css, '.bar button[role="tab"]');
    expect(body).not.toBe("");
    expect(body).toMatch(
      /transition\s*:\s*transform\s+var\(--duration-press\)\s+var\(--ease-out\)\s*;/,
    );
    expect(body).not.toMatch(/background-color/);
    expect(body).not.toMatch(/color\s+120ms/);
  });

  it("copy button still transitions color and background", () => {
    const body = ruleBody(css, ".bar .copy");
    expect(body).toMatch(/background-color\s+120ms\s+ease/);
    expect(body).toMatch(/color\s+120ms\s+ease/);
    expect(body).toMatch(/transform\s+var\(--duration-press\)\s+var\(--ease-out\)/);
  });
});
