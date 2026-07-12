/**
 * /llms-full.txt — all docs prose + every example (title, description,
 * canonical spec JSON, Svelte source) from the manifest (prerendered; plan:
 * "one source, three uses" — this is the third use). Zero manual upkeep:
 * examples come from import.meta.glob over the corpus, prose from the same
 * generators the guide pages render.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { LlmsFullExample } from "$scripts/gen-llms";
import { buildLlmsFull, pruneSpecData } from "$scripts/gen-llms";

import { EXAMPLES } from "$lib/examples";
import { GUIDE_PAGES } from "$lib/guide";

export const prerender = true;

const specs = import.meta.glob<{ default: PortableSpec }>("$examples/*/*/spec.ts", {
  eager: true,
});
const svelteSources = import.meta.glob<string>("$examples/*/*/Example.svelte", {
  query: "?raw",
  import: "default",
  eager: true,
});

function pick<T>(table: Record<string, T>, suffix: string): T {
  const key = Object.keys(table).find((k) => k.endsWith(suffix));
  if (key === undefined) {
    throw new Error(`llms-full: example module not found: *${suffix}`);
  }
  return table[key];
}

export function GET(): Response {
  const examples: LlmsFullExample[] = EXAMPLES.map((entry) => {
    const full = pick(specs, `/${entry.id}/spec.ts`).default;
    // Cap inline data so one 10k-row example cannot dominate the corpus.
    const { spec, prunedRows } = pruneSpecData(full, 20);
    const suffix =
      prunedRows > 0 ? `\n// note: inline data truncated (${String(prunedRows)} more rows)` : "";
    return {
      ...entry,
      specJSON: JSON.stringify(spec, null, 2) + suffix,
      svelteSource: pick(svelteSources, `/${entry.id}/Example.svelte`),
    };
  });
  return new Response(buildLlmsFull(GUIDE_PAGES, examples), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
