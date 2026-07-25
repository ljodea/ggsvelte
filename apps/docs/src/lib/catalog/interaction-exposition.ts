/**
 * Interaction expositions are live demos of the interaction system (tool rails,
 * linked controllers, facet interval presets). They are not chart gallery
 * specimens — ugly demo chrome bleeds into previews and they are wrong to
 * feature next to marks/stats examples.
 *
 * Corpus stays under examples/interaction/* for VR + loadExample; public routes
 * live under /interactions/<name>.
 */
export const INTERACTION_EXPOSITION_IDS = [
  "interaction/brush-zoom",
  "interaction/facet-intervals",
  "interaction/linked-views",
] as const;

export type InteractionExpositionId = (typeof INTERACTION_EXPOSITION_IDS)[number];

const EXPOSITION_SET = new Set<string>(INTERACTION_EXPOSITION_IDS);

/** Example corpus id → public /interactions slug (name segment only). */
export function interactionExpositionSlug(id: string): string | undefined {
  if (!EXPOSITION_SET.has(id)) return undefined;
  const slash = id.indexOf("/");
  return slash === -1 ? undefined : id.slice(slash + 1);
}

export function isInteractionExposition(id: string): boolean {
  return EXPOSITION_SET.has(id);
}

/** Resolve a /interactions/[name] slug to the examples corpus id. */
export function interactionExpositionIdForSlug(slug: string): InteractionExpositionId | undefined {
  const id = `interaction/${slug}`;
  return EXPOSITION_SET.has(id) ? (id as InteractionExpositionId) : undefined;
}
