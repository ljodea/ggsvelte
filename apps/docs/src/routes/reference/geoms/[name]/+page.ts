import { error } from "@sveltejs/kit";

import { GEOM_REFERENCE, type GeomName, KNOWN_GEOMS } from "@ggsvelte/spec";

import { EXAMPLES } from "$lib/examples";

import type { EntryGenerator, PageLoad } from "./$types";

const GEOM_SET = new Set<string>(KNOWN_GEOMS);

/** Prerender one page per geom (adapter-static). */
export const entries: EntryGenerator = () => KNOWN_GEOMS.map((name) => ({ name }));

function relatedExamples(geom: GeomName) {
  return EXAMPLES.filter(
    (entry) =>
      entry.category === geom ||
      entry.category === geom.replaceAll("_", "") ||
      entry.tags.includes(geom) ||
      entry.tags.includes(geom.replaceAll("_", "-")),
  ).slice(0, 8);
}

export const load: PageLoad = ({ params }) => {
  const name = params.name;
  if (!GEOM_SET.has(name)) {
    error(404, `No geom reference for "${name}".`);
  }
  const entry = GEOM_REFERENCE[name as GeomName];
  return {
    entry,
    examples: relatedExamples(entry.name).map((ex) => ({
      id: ex.id,
      title: ex.title,
      href: `/examples/${ex.id}`,
    })),
  };
};
