/**
 * Guards: docs code chrome must not static-import svelte-highlight.
 * That package (~100KB) was modulepreloaded on every page with CopyCode/CodeTabs.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const docsSrc = path.join(root, "apps/docs/src");

function read(rel: string): string {
  return readFileSync(path.join(docsSrc, rel), "utf8");
}

describe("docs highlight lazy load", () => {
  it("keeps CopyCode free of static svelte-highlight imports", () => {
    const source = read("lib/components/CopyCode.svelte");
    expect(source).not.toMatch(/import\s+Highlight\s+from\s*["']svelte-highlight["']/);
    expect(source).not.toMatch(/from\s*["']\$lib\/code-languages["']/);
    expect(source).toMatch(/import\s*\(|LazyHighlight|loadHighlight/);
  });

  it("keeps CodeTabs free of static svelte-highlight imports", () => {
    const source = read("lib/CodeTabs.svelte");
    expect(source).not.toMatch(/import\s+Highlight\s+from\s*["']svelte-highlight["']/);
    expect(source).not.toMatch(/from\s*["']\$lib\/code-languages["']/);
    expect(source).toMatch(/import\s*\(|LazyHighlight|loadHighlight/);
  });

  it("loads highlight only through the shared deferred loader", () => {
    const loader = read("lib/load-highlight.ts");
    expect(loader).toContain("svelte-highlight");
    expect(loader).toContain("code-languages");
    expect(loader).toMatch(/import\s*\(\s*["']svelte-highlight["']\s*\)/);
  });
});
