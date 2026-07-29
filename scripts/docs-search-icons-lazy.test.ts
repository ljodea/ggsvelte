/**
 * PR2 guards: search UI and phosphor stay off the default docs chrome graph.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const docsSrc = path.join(import.meta.dirname, "../apps/docs/src");

function walkFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated") continue;
      out.push(...walkFiles(full));
      continue;
    }
    if (/\.(svelte|ts|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("docs search + icons lazy path (PR2)", () => {
  it("does not statically import phosphor-svelte from docs UI", () => {
    const offenders: string[] = [];
    for (const file of walkFiles(docsSrc)) {
      const source = readFileSync(file, "utf8");
      if (/from\s*["']phosphor-svelte/.test(source)) {
        offenders.push(path.relative(docsSrc, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("loads SiteSearch only via dynamic import from the header", () => {
    const header = readFileSync(path.join(docsSrc, "lib/components/SiteHeader.svelte"), "utf8");
    expect(header).not.toMatch(/import\s+SiteSearch\s+from\s*["']\.\/SiteSearch\.svelte["']/);
    expect(header).toContain('import("./SiteSearch.svelte")');
  });

  it("shares inline copy icons for CopyCode and guide fences", () => {
    const icons = readFileSync(path.join(docsSrc, "lib/copy-icons.ts"), "utf8");
    expect(icons).toContain("COPY_ICON_SVG");
    expect(icons).toContain("CHECK_ICON_SVG");
    const copyCode = readFileSync(path.join(docsSrc, "lib/components/CopyCode.svelte"), "utf8");
    expect(copyCode).toContain("$lib/copy-icons");
    expect(copyCode).not.toContain("phosphor-svelte");
  });
});
