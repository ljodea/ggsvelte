/**
 * Guards for docs PR1: chart stack stays off pure list/prose client modules.
 *
 * Source-level only (no full vite build) so unit CI stays cheap. Complements
 * production benchmarks in .gstack/benchmark-reports/.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const docsSrc = path.join(root, "apps/docs/src");

function read(rel: string): string {
  return readFileSync(path.join(docsSrc, rel), "utf8");
}

describe("docs chart stack isolation (PR1)", () => {
  it("keeps gallery and pure list pages on the thin examples manifest", () => {
    const gallery = read("routes/examples/+page.svelte");
    const home = read("routes/+page.svelte");
    const interactionsIndex = read("routes/interactions/+page.svelte");
    for (const [label, source] of [
      ["gallery", gallery],
      ["home", home],
      ["interactions index", interactionsIndex],
    ] as const) {
      expect(source, label).toContain("$lib/examples-manifest");
      expect(source, label).not.toMatch(
        /from\s*["']\$lib\/examples["']|from\s*["']\$lib\/examples\.js["']/,
      );
    }
  });

  it("does not put GettingStartedGuide on the shared markdown guide module", () => {
    const markdownGuide = read("routes/guide/[slug]/+page.svelte");
    expect(markdownGuide).not.toContain("GettingStartedGuide");
    expect(markdownGuide).toContain("attachGuideCodeCopy");

    const lesson = read("routes/guide/getting-started/+page.svelte");
    expect(lesson).toContain("GettingStartedGuide");
  });

  it("excludes getting-started from the dynamic guide [slug] entries", () => {
    const server = read("routes/guide/[slug]/+page.server.ts");
    expect(server).toContain('p.slug !== "getting-started"');
  });

  it("isolates @ggsvelte packages via vite/rolldown codeSplitting groups", () => {
    const vite = readFileSync(path.join(root, "apps/docs/vite.config.ts"), "utf8");
    expect(vite).toContain("codeSplitting");
    expect(vite).toContain("svelte-runtime");
    expect(vite).toContain("ggsvelte-core");
    expect(vite).toContain("ggsvelte-svelte");
    expect(vite).toContain("ggsvelte-spec");
    expect(vite).toContain("priority: 30");
  });

  it("keeps root layout free of static @ggsvelte chart imports", () => {
    const layout = read("routes/+layout.svelte");
    expect(layout).not.toMatch(/from\s*["']@ggsvelte\/(?:svelte|core)["']/);
  });
});
