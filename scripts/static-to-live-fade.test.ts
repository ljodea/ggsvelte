/**
 * Static chart shells fade out. Live plots snap in so marks do not fade.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const ROOT = join(import.meta.dir, "..");
const FRAME = join(ROOT, "apps/docs/src/lib/components/ExampleLiveFrame.svelte");
const GRAMMAR = join(ROOT, "apps/docs/src/lib/components/GrammarDemo.svelte");

function styleBlock(source: string): string {
  const match = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  return match?.[1] ?? "";
}

describe("static-to-live shell fade", () => {
  const frame = readFileSync(FRAME, "utf8");
  const grammar = readFileSync(GRAMMAR, "utf8");

  it("fades the example preview, not the live host", () => {
    const css = styleBlock(frame);
    expect(css).toMatch(
      /\.example-preview[^{]*\{[^}]*opacity\s+var\(--duration-popover\)\s+var\(--ease-out\)/s,
    );
    expect(css).toMatch(/\.example-preview\.fade-out[^{]*\{[^}]*opacity:\s*0/s);
    expect(css).not.toMatch(/\.live-host[^{]*\{[^}]*transition/s);
  });

  it("keeps the example preview until fade-out completes", () => {
    expect(frame).toMatch(/shellVisible/);
    expect(frame).toMatch(/ontransitionend/);
    expect(frame).toMatch(/\{#if shellVisible\}/);
  });

  it("overlaps GrammarDemo static and live without fading marks", () => {
    const css = styleBlock(grammar);
    expect(css).toMatch(
      /\.grammar-static-wrap[^{]*\{[^}]*opacity\s+var\(--duration-popover\)\s+var\(--ease-out\)/s,
    );
    expect(css).toMatch(/\.grammar-static-wrap\.fade-out[^{]*\{[^}]*opacity:\s*0/s);
    expect(css).not.toMatch(/\.grammar-live[^{]*\{[^}]*transition/s);
    expect(grammar).toMatch(/liveReady/);
    expect(grammar).toMatch(/if \(!liveReady\) restoreKeyboardFocus = true/);
  });
});
