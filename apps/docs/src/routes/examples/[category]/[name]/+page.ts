import { error, redirect } from "@sveltejs/kit";

import { interactionExpositionSlug } from "$lib/catalog/interaction-exposition";
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

export const load: PageLoad = async ({ params, url }) => {
  const requestedId = `${params.category}/${params.name}`;
  const id = resolveExampleId(requestedId);
  const expositionSlug = interactionExpositionSlug(id);
  if (expositionSlug !== undefined) {
    // Chart-local interaction expositions live under /interactions, not the gallery.
    // Preserve ?vr (and other query) for visual-regression capture paths.
    const search = url.search;
    redirect(308, `/interactions/${expositionSlug}${search}`);
  }
  const entry = EXAMPLES.find((e) => e.id === id);
  if (entry === undefined) {
    error(404, `No example "${requestedId}" — see /examples for the gallery.`);
  }
  return { entry, ...(await loadExample(id)) };
};
