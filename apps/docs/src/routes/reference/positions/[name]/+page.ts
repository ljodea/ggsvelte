import { error } from "@sveltejs/kit";

import { POSITION_REFERENCE, type PositionName, KNOWN_POSITIONS } from "@ggsvelte/spec";

import { EXAMPLES } from "$lib/examples";

import type { EntryGenerator, PageLoad } from "./$types";

const POSITION_SET = new Set<string>(KNOWN_POSITIONS);

/** Prerender one page per position (adapter-static). */
export const entries: EntryGenerator = () => KNOWN_POSITIONS.map((name) => ({ name }));

function relatedExamples(position: PositionName) {
  return EXAMPLES.filter(
    (entry) =>
      entry.tags.includes(position) ||
      entry.tags.includes(`position-${position}`) ||
      entry.tags.includes(`position_${position}`) ||
      entry.id.includes(position),
  ).slice(0, 8);
}

export const load: PageLoad = ({ params }) => {
  const name = params.name;
  if (!POSITION_SET.has(name)) {
    error(404, `No position reference for "${name}".`);
  }
  const entry = POSITION_REFERENCE[name as PositionName];
  return {
    entry,
    examples: relatedExamples(entry.name).map((ex) => ({
      id: ex.id,
      title: ex.title,
      href: `/examples/${ex.id}`,
    })),
  };
};
