/** Canonical documentation journeys that preserve the original stable URLs. */
export const EXAMPLE_ALIASES = Object.freeze({
  "interactions/inspection": "interaction/tooltip",
  "interactions/interval-selection": "interaction/brush-zoom",
} as const);

export function resolveExampleId(id: string): string {
  return EXAMPLE_ALIASES[id as keyof typeof EXAMPLE_ALIASES] ?? id;
}
