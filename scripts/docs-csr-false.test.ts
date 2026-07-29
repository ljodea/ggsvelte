/**
 * Guards for docs PR4: pure prose / static list routes skip page hydration
 * (csr=false) while layout chrome and guide fence copy stay interactive.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const docsSrc = path.join(import.meta.dirname, "../apps/docs/src");

function read(rel: string): string {
  return readFileSync(path.join(docsSrc, rel), "utf8");
}

describe("docs csr=false on inert routes (PR4)", () => {
  it("disables page CSR on pure markdown guide chapters", () => {
    const server = read("routes/guide/[slug]/+page.server.ts");
    expect(server).toMatch(/export\s+const\s+csr\s*=\s*false/);
    const page = read("routes/guide/[slug]/+page.svelte");
    expect(page).not.toContain("attachGuideCodeCopy");
    expect(page).not.toContain("GettingStartedGuide");
  });

  it("keeps getting-started hydratable (live lesson chart)", () => {
    const lesson = read("routes/guide/getting-started/+page.svelte");
    expect(lesson).toContain("GettingStartedGuide");
    // No csr=false colocated with getting-started.
    try {
      const server = read("routes/guide/getting-started/+page.server.ts");
      expect(server).not.toMatch(/export\s+const\s+csr\s*=\s*false/);
    } catch {
      // optional server file
    }
  });

  it("attaches guide fence copy on DocsShell so csr=false guides still copy", () => {
    const shell = read("lib/components/DocsShell.svelte");
    expect(shell).toContain("attachGuideCodeCopy");
    expect(shell).toContain("{@attach attachGuideCodeCopy}");
  });

  it("disables page CSR on static hubs and reference detail cards", () => {
    for (const rel of [
      "routes/docs/+page.ts",
      "routes/reference/+page.ts",
      "routes/reference/geoms/[name]/+page.ts",
      "routes/reference/stats/[name]/+page.ts",
      "routes/reference/positions/[name]/+page.ts",
    ]) {
      expect(read(rel), rel).toMatch(/export\s+const\s+csr\s*=\s*false/);
    }
  });
});
