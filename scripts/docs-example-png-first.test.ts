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

  it("defers Example.svelte via user intent, button, or ?vr eager load", () => {
    const frame = read("lib/components/ExampleLiveFrame.svelte");
    expect(frame).toContain("loadExampleComponent");
    expect(frame).toContain("observeUserIntent");
    expect(frame).not.toContain("observeNearViewport");
    expect(frame).toContain("Load interactive chart");
    expect(frame).toContain('has("vr")');
    expect(frame).toContain("example-preview");
    expect(frame).toContain("previewPath");
    // VR starts the import at module init, not only in onMount.
    expect(frame).toContain('typeof window !== "undefined"');
    // Keyboard path is a real button (not tabindex on a noninteractive div).
    expect(frame).not.toContain('tabindex="0"');
  });

  it("keeps the static shell until data-gg-ready so the plot box does not poof", () => {
    const frame = read("lib/components/ExampleLiveFrame.svelte");
    expect(frame).toContain('data-gg-ready="true"');
    expect(frame).toContain("liveReady");
    expect(frame).toContain("MutationObserver");
  });

  it("reserves shell height with unitless aspect-ratio only until live (#1363)", () => {
    // aspect-ratio rejects length tokens (640px); use unitless --example-vr-w/h
    // while loading, then drop the ratio so live chrome is not clipped.
    const frame = read("lib/components/ExampleLiveFrame.svelte");
    expect(frame).toContain("--example-vr-w:");
    expect(frame).toContain("--example-vr-h:");
    expect(frame).toMatch(/aspect-ratio:\s*var\(--example-vr-w\)\s*\/\s*var\(--example-vr-h\)/);
    expect(frame).not.toMatch(/aspect-ratio:\s*var\(--example-vr-width\)/);
    expect(frame).toContain("under-live");
    expect(frame).toMatch(/:not\(\.live-ready\)/);
    expect(frame).toContain("READY_FALLBACK_MS");
  });

  it("hands keyboard focus to the plot after an intent upgrade (#1362)", () => {
    // Tabbing into "Load interactive chart" must not drop focus to <body> when
    // the shell unmounts. Prefer .gg-capture; fall back to ready plot root.
    const frame = read("lib/components/ExampleLiveFrame.svelte");
    expect(frame).toContain("restoreKeyboardFocus");
    expect(frame).toContain("focusAfterUpgrade");
    expect(frame).toContain(".gg-capture");
    expect(frame).toContain("gg-plot-root");
    expect(frame).toMatch(/\.focus\(/);
    expect(frame).toContain("onfocusout");
    // Keep the load control focusable while the import resolves (no disabled blur).
    expect(frame).toMatch(/Loading/);
    expect(frame).toContain("aria-disabled");
    expect(frame).not.toMatch(/[^\w-]disabled=\{Live/);
  });

  it("keeps loadExample for callers that still need the full bundle", () => {
    const examples = read("lib/examples.ts");
    expect(examples).toContain("export async function loadExampleSources");
    expect(examples).toContain("export async function loadExampleComponent");
    expect(examples).toContain("export async function loadExample");
  });

  it("drains load buttons by count so multi-chart pages complete (#1362)", () => {
    // Click one, wait for "Load interactive chart" count to drop (Loading… label
    // or unmount). Avoid frozen nth indices and .first()+detached re-resolve.
    const helper = readFileSync(path.join(root, "tests/visual/helpers/deterministic.ts"), "utf8");
    expect(helper).toContain('getByRole("button", { name: "Load interactive chart" })');
    expect(helper).toContain("toHaveCount");
    expect(helper).not.toMatch(/loadButtons\.nth\(/);
  });
});
