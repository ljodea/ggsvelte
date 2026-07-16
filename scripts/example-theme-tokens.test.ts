/**
 * Docs theme tokens live on :root as --fg / --bg / --surface / --muted
 * (apps/docs/src/app.css). Example chrome that hard-codes var(--text, #17202a)
 * never resolves --text, so buttons and tables stay near-black in dark theme.
 *
 * Regression for the post-merge finding on #44 (linked-views dark baseline).
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const DOCS_CSS = join(ROOT, "apps/docs/src/app.css");
const INTERACTION_EXAMPLES = join(ROOT, "examples/interaction");

function exampleSvelteSources(): Array<{ id: string; source: string }> {
  return readdirSync(INTERACTION_EXAMPLES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const path = join(INTERACTION_EXAMPLES, entry.name, "Example.svelte");
      return { id: `interaction/${entry.name}`, source: readFileSync(path, "utf8") };
    });
}

describe("docs theme tokens", () => {
  it("defines --fg for light and dark themes (not --text)", () => {
    const css = readFileSync(DOCS_CSS, "utf8");
    expect(css).toMatch(/:root\s*\{[^}]*--fg\s*:/s);
    expect(css).toMatch(/:root\[data-theme="dark"\]\s*\{[^}]*--fg\s*:/s);
    expect(css).not.toMatch(/--text\s*:/);
  });
});

describe("interaction example chrome", () => {
  for (const { id, source } of exampleSvelteSources()) {
    it(`${id} uses docs --fg (or inherit), never undefined --text`, () => {
      expect(source).not.toMatch(/var\(\s*--text\b/);
    });
  }

  it("linked-views body text and buttons track --fg so dark theme stays readable", () => {
    const source = readFileSync(
      join(INTERACTION_EXAMPLES, "linked-views", "Example.svelte"),
      "utf8",
    );
    // Buttons and table inherit the docs foreground token (or inherit body color).
    expect(source).toMatch(/color:\s*var\(\s*--fg\b/);
    expect(source).not.toMatch(/color:\s*var\(\s*--text\b/);
  });
});
