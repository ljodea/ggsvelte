import { describe, expect, test } from "bun:test";

import {
  highlightDocsBlock,
  languageFromCodeTabLabel,
  resolveCodeLanguage,
} from "../apps/docs/src/lib/code-languages";

describe("languageFromCodeTabLabel", () => {
  test("maps triptych labels to highlight languages", () => {
    expect(languageFromCodeTabLabel("Svelte")).toBe("svelte");
    expect(languageFromCodeTabLabel("Builder (TS)")).toBe("typescript");
    expect(languageFromCodeTabLabel("Spec (JSON)")).toBe("json");
    expect(languageFromCodeTabLabel("Type definitions")).toBe("typescript");
    expect(languageFromCodeTabLabel("README")).toBe("plaintext");
    expect(languageFromCodeTabLabel()).toBe("plaintext");
  });
});

describe("resolveCodeLanguage", () => {
  test("resolves aliases and falls back to plaintext", () => {
    expect(resolveCodeLanguage("ts")).toBe("ts");
    expect(resolveCodeLanguage("typescript")).toBe("typescript");
    expect(resolveCodeLanguage("")).toBe("plaintext");
    expect(resolveCodeLanguage()).toBe("plaintext");
    expect(resolveCodeLanguage("nope-not-a-lang")).toBe("plaintext");
    expect(resolveCodeLanguage("text")).toBe("plaintext");
  });
});

describe("highlightDocsBlock", () => {
  test("emits hljs pre/code with token spans for known languages", () => {
    const html = highlightDocsBlock("const answer = 42;", "ts");
    expect(html).toContain('<pre class="hljs">');
    expect(html).toContain('class="hljs language-ts"');
    expect(html).toContain("hljs-");
    expect(html).toContain("const");
    expect(html).not.toContain("<script");
  });

  test("escapes plaintext for unknown languages", () => {
    const html = highlightDocsBlock("<b>x</b>", "not-a-language");
    expect(html).toContain('<pre class="hljs">');
    expect(html).toContain('class="hljs"');
    expect(html).not.toContain("language-");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
