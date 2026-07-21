import { describe, expect, it } from "bun:test";

import { highlightCodeToHtml, resolveHighlightLanguage } from "./highlight-code.ts";

describe("highlight-code", () => {
  it("maps fence aliases to registered languages", () => {
    expect(resolveHighlightLanguage("ts")).toBe("typescript");
    expect(resolveHighlightLanguage("svelte")).toBe("xml");
    expect(resolveHighlightLanguage("sh")).toBe("bash");
    expect(resolveHighlightLanguage("unknown-lang")).toBeUndefined();
  });

  it("emits highlight.js token spans for known languages", () => {
    const html = highlightCodeToHtml("const answer = 42;", "ts");
    expect(html).toContain("hljs-");
    expect(html).toContain("const");
    expect(html).not.toContain("<script");
  });

  it("escapes plaintext for unknown languages", () => {
    expect(highlightCodeToHtml("<b>x</b>", "not-a-language")).toBe("&lt;b&gt;x&lt;/b&gt;");
  });
});
