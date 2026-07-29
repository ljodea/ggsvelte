/**
 * Guards for docs PR3: example detail pages paint the gallery PNG first and
 * only load Example.svelte (chart stack) via a deferred client import.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const docsSrc = path.join(root, "apps/docs/src");

function read(rel: string): string {
  return readFileSync(path.join(docsSrc, rel), "utf8");
}

describe("docs example PNG-first (PR3)", () => {
  it("loads sources only in the example page load function", () => {
    const pageLoad = read("routes/examples/[category]/[name]/+page.ts");
    expect(pageLoad).toContain("loadExampleSources");
    expect(pageLoad).toContain("previewPathFor");
    expect(pageLoad).not.toMatch(/loadExample\b(?!Sources)|loadExampleComponent/);
  });

  it("mounts the live chart only through ExampleLiveFrame", () => {
    const page = read("routes/examples/[category]/[name]/+page.svelte");
    expect(page).toContain("ExampleLiveFrame");
    expect(page).not.toMatch(/\bdata\.component\b/);
    expect(page).not.toMatch(/<\s*Example\s*\/>/);
    // Remount on client nav so Live state does not stick to the prior id.
    expect(page).toContain("{#key data.entry.id}");
  });

  it("defers Example.svelte via near-viewport or ?vr eager load", () => {
    const frame = read("lib/components/ExampleLiveFrame.svelte");
    expect(frame).toContain("loadExampleComponent");
    expect(frame).toContain("observeNearViewport");
    expect(frame).toContain('has("vr")');
    expect(frame).toContain("example-preview");
    expect(frame).toContain("previewPath");
    // VR starts the import at module init, not only in onMount.
    expect(frame).toContain('typeof window !== "undefined"');
  });

  it("keeps loadExample for callers that still need the full bundle", () => {
    const examples = read("lib/examples.ts");
    expect(examples).toContain("export async function loadExampleSources");
    expect(examples).toContain("export async function loadExampleComponent");
    expect(examples).toContain("export async function loadExample");
  });
});
