import { error } from "@sveltejs/kit";

import { GUIDE_PAGES } from "$lib/guide";

import type { EntryGenerator, PageLoad } from "./$types";

/** Prerender one page per guide entry (adapter-static). */
export const entries: EntryGenerator = () => GUIDE_PAGES.map((p) => ({ slug: p.slug }));

export const load: PageLoad = ({ params }) => {
  const page = GUIDE_PAGES.find((p) => p.slug === params.slug);
  if (page === undefined) {
    error(404, `No guide page "${params.slug}".`);
  }
  return { page };
};
