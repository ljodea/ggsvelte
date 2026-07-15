import { error } from "@sveltejs/kit";

import { EXAMPLE_ALIASES, resolveExampleId } from "$lib/example-aliases";
import { EXAMPLES, loadExample } from "$lib/examples";

import type { EntryGenerator, PageLoad } from "./$types";

/** Prerender one page per manifest entry (adapter-static). */
export const entries: EntryGenerator = () => [
  ...EXAMPLES.map((e) => ({ category: e.category, name: e.name })),
  ...Object.keys(EXAMPLE_ALIASES).map((id) => {
    const [category, name] = id.split("/");
    return { category, name };
  }),
];

export const load: PageLoad = async ({ params }) => {
  const requestedId = `${params.category}/${params.name}`;
  const id = resolveExampleId(requestedId);
  const entry = EXAMPLES.find((e) => e.id === id);
  if (entry === undefined) {
    error(404, `No example "${requestedId}" — see /examples for the gallery.`);
  }
  return { entry, ...(await loadExample(id)) };
};
