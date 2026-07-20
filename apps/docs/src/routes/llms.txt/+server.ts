/**
 * /llms.txt — the curated agent-facing index (prerendered at build; plan:
 * "llms.txt + llms-full.txt prerendered from the manifest"). Content comes
 * from scripts/gen-llms.ts (bun-tested) + the generated examples manifest —
 * zero manual upkeep.
 */
import { buildLlmsIndex, docsDiscoveryFacts } from "$scripts/gen-llms";

import { EXAMPLES } from "$lib/examples";
import { docsBuildConfig } from "$lib/server/build-config";
import { GUIDE_PAGES } from "$lib/guide";

export const prerender = true;

export function GET(): Response {
  const config = docsBuildConfig();
  return new Response(
    buildLlmsIndex(GUIDE_PAGES, EXAMPLES, docsDiscoveryFacts(config.canonicalBase)),
    {
      headers: { "content-type": "text/plain; charset=utf-8" },
    },
  );
}
