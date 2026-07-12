import { error } from "@sveltejs/kit";

import { EXAMPLES, loadExample } from "$lib/examples";

import type { EntryGenerator, PageLoad } from "./$types";

/** Prerender one page per manifest entry (adapter-static). */
export const entries: EntryGenerator = () =>
  EXAMPLES.map((e) => ({ category: e.category, name: e.name }));

export const load: PageLoad = async ({ params }) => {
  const id = `${params.category}/${params.name}`;
  const entry = EXAMPLES.find((e) => e.id === id);
  if (entry === undefined) {
    error(404, `No example "${id}" — see /examples for the gallery.`);
  }
  return { entry, ...(await loadExample(id)) };
};
