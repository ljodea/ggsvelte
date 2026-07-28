import { describe, expect, it } from "vitest";

import { buildGeomSvelteSnippet, plotAesLiteral } from "../src/lib/reference-snippets";

describe("plotAesLiteral", () => {
  it("omits y when the default stat computes it (bar / count)", () => {
    expect(plotAesLiteral("bar", "count")).toBe('aes={{ x: "x" }}');
    expect(plotAesLiteral("histogram", "bin")).toBe('aes={{ x: "x" }}');
    expect(plotAesLiteral("freqpoly", "bin")).toBe('aes={{ x: "x" }}');
    expect(plotAesLiteral("density", "density")).toBe('aes={{ x: "x" }}');
    expect(plotAesLiteral("dotplot", "bindot")).toBe('aes={{ x: "x" }}');
  });

  it("keeps x and y for identity geoms that need both", () => {
    expect(plotAesLiteral("col", "identity")).toBe('aes={{ x: "x", y: "y" }}');
    expect(plotAesLiteral("point", "identity")).toBe('aes={{ x: "x", y: "y" }}');
  });

  it("uses sample for qq geoms", () => {
    expect(plotAesLiteral("qq", "qq")).toBe('aes={{ sample: "sample" }}');
  });
});

describe("buildGeomSvelteSnippet", () => {
  it("bar sample maps only x — matches Do not map aes.y lede", () => {
    const snip = buildGeomSvelteSnippet("GeomBar", "bar", "count", []);
    expect(snip).toContain('aes={{ x: "x" }}');
    expect(snip).not.toMatch(/aes=\{\{[^}]*\by:/);
    expect(snip).toContain("<GeomBar />");
  });

  it("col sample still maps x and y", () => {
    const snip = buildGeomSvelteSnippet("GeomCol", "col", "identity", []);
    expect(snip).toContain('aes={{ x: "x", y: "y" }}');
  });
});
