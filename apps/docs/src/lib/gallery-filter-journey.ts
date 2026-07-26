/**
 * Contract for the gallery URL-filter journey
 * (`tests/visual/docs-home-gallery.spec.ts`).
 *
 * Query/category must hit the live gallery haystack (id, title, tags,
 * docsSection, category) — not chart Labs copy and not meta descriptions
 * (deleted corpus-wide in #765; see #773 / #767).
 *
 * Unit tests import the same constants so a drift between the journey and the
 * catalog fails at `bun test` speed instead of only on component-journeys.
 */
export const GALLERY_FILTER_JOURNEY_QUERY = "scatter";
export const GALLERY_FILTER_JOURNEY_CATEGORY = "bar";
