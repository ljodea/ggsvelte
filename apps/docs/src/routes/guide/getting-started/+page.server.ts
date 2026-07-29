import { GUIDE_PAGES } from "$lib/guide";

import type { PageServerLoad } from "./$types";

/** Keep layout SEO/title wired the same way as other guide chapters. */
export const load: PageServerLoad = () => {
  const page = GUIDE_PAGES.find((entry) => entry.slug === "getting-started");
  if (page === undefined) {
    throw new Error("getting-started guide page missing from GUIDE_PAGES");
  }
  return {
    page: { slug: page.slug, title: page.title, description: page.description },
  };
};
