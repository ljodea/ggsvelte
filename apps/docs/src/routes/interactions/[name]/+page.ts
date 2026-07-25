import { error } from "@sveltejs/kit";

import {
  INTERACTION_EXPOSITION_IDS,
  interactionExpositionIdForSlug,
} from "$lib/catalog/interaction-exposition";
import { EXAMPLES, loadExample } from "$lib/examples";

import type { EntryGenerator, PageLoad } from "./$types";

/** Prerender one page per interaction exposition slug. */
export const entries: EntryGenerator = () =>
  INTERACTION_EXPOSITION_IDS.map((id) => ({ name: id.slice("interaction/".length) }));

export const load: PageLoad = async ({ params }) => {
  const id = interactionExpositionIdForSlug(params.name);
  if (id === undefined) {
    error(404, `No interaction demo "${params.name}" — see /interactions.`);
  }
  const entry = EXAMPLES.find((e) => e.id === id);
  if (entry === undefined) {
    error(404, `No interaction demo "${params.name}" — see /interactions.`);
  }
  return { entry, ...(await loadExample(id)) };
};
