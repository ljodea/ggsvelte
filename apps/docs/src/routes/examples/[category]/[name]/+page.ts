import { error } from "@sveltejs/kit";

import { previewPathFor } from "$lib/catalog/gallery";
import { EXAMPLE_ALIASES, resolveExampleId } from "$lib/example-aliases";
import { EXAMPLES, loadExampleSources } from "$lib/examples";

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
  // Interaction expositions stay loadable at /examples/interaction/*; the
  // gallery listing excludes them (see isInteractionExposition).
  const entry = EXAMPLES.find((e) => e.id === id);
  if (entry === undefined) {
    error(404, `No example "${requestedId}" — see /examples for the gallery.`);
  }
  // Sources only — live Example.svelte mounts client-side after the PNG paints
  // (see ExampleLiveFrame). Avoids blocking page load on the chart stack.
  return {
    entry,
    previewPath: previewPathFor(id),
    ...(await loadExampleSources(id)),
  };
};
