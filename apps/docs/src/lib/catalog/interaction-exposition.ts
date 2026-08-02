/**
 * Interaction expositions are live demos of the interaction system (tool rails,
 * linked controllers, facet interval presets). They are not chart gallery
 * specimens — ugly demo chrome bleeds into previews and they are wrong to
 * feature next to marks/stats examples.
 *
 * Public routes live under /examples/interaction/* (same as the corpus).
 * Gallery listing excludes these ids via isInteractionExposition.
 */
export const INTERACTION_EXPOSITION_IDS = [
  "interaction/brush-zoom",
  "interaction/facet-intervals",
  "interaction/linked-views",
] as const;

export type InteractionExpositionId = (typeof INTERACTION_EXPOSITION_IDS)[number];

const EXPOSITION_SET = new Set<string>(INTERACTION_EXPOSITION_IDS);

export function isInteractionExposition(id: string): boolean {
  return EXPOSITION_SET.has(id);
}
