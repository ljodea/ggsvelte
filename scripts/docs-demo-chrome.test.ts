import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

const docsAppCss = readFileSync(join(import.meta.dir, "../apps/docs/src/app.css"), "utf8");

describe("docs VR demo-chrome hide (#650)", () => {
  it("hides .gg-demo-chrome under data-vr and data-visual-test", () => {
    expect(docsAppCss).toMatch(
      /html\[data-vr\]\s+\.gg-demo-chrome[\s\S]*?display:\s*none\s*!important/s,
    );
    expect(docsAppCss).toMatch(
      /html\[data-visual-test\]\s+\.gg-demo-chrome[\s\S]*?display:\s*none\s*!important/s,
    );
  });
});

describe("interaction examples mark demo furniture (#650)", () => {
  const roots = [
    "examples/interaction/brush-zoom/Example.svelte",
    "examples/interaction/facet-intervals/Example.svelte",
    "examples/interaction/legend-filter/Example.svelte",
    "examples/interaction/legend-focus/Example.svelte",
    "examples/interaction/linked-views/Example.svelte",
    "examples/interaction/tooltip/Example.svelte",
  ];

  for (const root of roots) {
    it(`${root} opts demo chrome into .gg-demo-chrome`, () => {
      const src = readFileSync(join(import.meta.dir, "..", root), "utf8");
      expect(src).toContain("gg-demo-chrome");
    });
  }
});
