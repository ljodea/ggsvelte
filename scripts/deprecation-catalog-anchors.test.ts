/**
 * Test 13 (#659 slice 2): every DEPRECATION_DIAGNOSTIC_CATALOG-driven docUrl
 * anchor resolves against the rendered upgrading guide. The deprecation-wiring
 * suite only walks JSDoc; runtime advisories would ship a wrong anchor silently.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { LifecycleDoc } from "./gen-llms.ts";
import { guidePages, renderMarkdown } from "./gen-llms.ts";

const ROOT = join(import.meta.dir, "..");
const GUIDE_URL_BASE = "https://ggsvelte.sh/guide/";

const lifecycle = JSON.parse(readFileSync(join(ROOT, "lifecycle.json"), "utf8")) as LifecycleDoc;

function guideAnchors(): Map<string, Set<string>> {
  const anchors = new Map<string, Set<string>>();
  for (const page of guidePages(lifecycle)) {
    const ids = [...renderMarkdown(page.markdown).matchAll(/<h\d id="([^"]+)"/g)].map(
      (match) => match[1]!,
    );
    anchors.set(page.slug, new Set(ids));
  }
  return anchors;
}

/**
 * Anchors emitted by live runtime advisories this release — deprecation
 * (deprecatedPropDiagnostic) and composition (duplicateScaleChannelDiagnostic)
 * alike. Both ship a docUrl, so both need the anchor to actually resolve.
 */
const RUNTIME_ADVISORY_URLS = [
  "https://ggsvelte.sh/guide/upgrading#compose-the-theme-as-a-child-layer",
  "https://ggsvelte.sh/guide/upgrading#compose-scales-as-child-layers",
  "https://ggsvelte.sh/guide/upgrading#compose-coord-as-a-child-layer",
  "https://ggsvelte.sh/guide/upgrading#compose-facet-as-a-child-layer",
] as const;

describe("diagnostic catalog runtime docUrl anchors", () => {
  it("every live runtime advisory docUrl anchor resolves in the rendered guide", () => {
    const anchors = guideAnchors();
    for (const url of RUNTIME_ADVISORY_URLS) {
      expect(url).toStartWith(GUIDE_URL_BASE);
      const [slug = "", fragment] = url.slice(GUIDE_URL_BASE.length).split("#");
      expect([...anchors.keys()], `unknown guide page "${slug}"`).toContain(slug);
      expect(fragment, `${url}: missing fragment`).toBeDefined();
      expect(
        [...(anchors.get(slug) ?? [])],
        `${url}: anchor #${fragment} missing from guide/${slug}`,
      ).toContain(fragment);
    }
  });
});
