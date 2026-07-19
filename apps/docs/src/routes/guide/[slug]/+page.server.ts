import { error } from "@sveltejs/kit";

import { GUIDE_PAGES } from "$lib/guide";
import { docsBuildConfig } from "$lib/server/build-config";
import { renderMarkdown } from "$scripts/gen-llms";

import type { EntryGenerator, PageServerLoad } from "./$types";

/** Prerender one page per guide entry (adapter-static). */
export const entries: EntryGenerator = () => GUIDE_PAGES.map((p) => ({ slug: p.slug }));

export const load: PageServerLoad = ({ params }) => {
  const page = GUIDE_PAGES.find((p) => p.slug === params.slug);
  if (page === undefined) {
    error(404, `No guide page "${params.slug}".`);
  }
  return {
    page: { slug: page.slug, title: page.title, description: page.description },
    html: renderMarkdown(page.markdown, docsBuildConfig().base),
  };
};
