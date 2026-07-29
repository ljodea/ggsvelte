import { error } from "@sveltejs/kit";

import { GUIDE_PAGES } from "$lib/guide";
import { docsBuildConfig } from "$lib/server/build-config";
import { renderMarkdown } from "$scripts/gen-llms";

import type { EntryGenerator, PageServerLoad } from "./$types";

/**
 * Pure prerendered HTML — no page hydration. Layout/DocsShell still hydrate
 * for nav, appearance, and guide fence copy (attachGuideCodeCopy on shell).
 */
export const csr = false;

/**
 * Prerender markdown guide chapters only. `/guide/getting-started` is a
 * dedicated static route so its client graph stays off every other chapter.
 */
export const entries: EntryGenerator = () =>
  GUIDE_PAGES.filter((p) => p.slug !== "getting-started").map((p) => ({
    slug: p.slug,
  }));

export const load: PageServerLoad = ({ params }) => {
  if (params.slug === "getting-started") {
    // Static segment `guide/getting-started` owns this URL; never dual-emit.
    error(404, `No guide page "${params.slug}".`);
  }
  const page = GUIDE_PAGES.find((p) => p.slug === params.slug);
  if (page === undefined) {
    error(404, `No guide page "${params.slug}".`);
  }
  return {
    page: { slug: page.slug, title: page.title, description: page.description },
    html: renderMarkdown(page.markdown, docsBuildConfig().base),
  };
};
