import { describe, expect, test } from "bun:test";

import { languageFromCodeTabLabel, resolveCodeLanguage } from "../apps/docs/src/lib/code-languages";

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
    expect(typeof resolveCodeLanguage("ts")).toBe("object");
    expect(resolveCodeLanguage("ts")).toBe(resolveCodeLanguage("typescript"));
    expect(resolveCodeLanguage("")).toBe(resolveCodeLanguage("plaintext"));
    expect(resolveCodeLanguage()).toBe(resolveCodeLanguage("plaintext"));
    expect(resolveCodeLanguage("nope-not-a-lang")).toBe(resolveCodeLanguage("plaintext"));
  });
});
