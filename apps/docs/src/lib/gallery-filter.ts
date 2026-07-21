import type { GalleryEntry } from "./catalog/gallery.js";

export interface GalleryFilterState {
  query: string;
  categories: string[];
  tags: string[];
}

export interface GalleryFilterOptions {
  categories: ReadonlySet<string>;
  tags: ReadonlySet<string>;
}

const OWNED_KEYS = ["q", "category", "tag"] as const;

function normalized(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ").toLowerCase();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].toSorted((left, right) => left.localeCompare(right));
}

export function filterGallery(
  entries: readonly GalleryEntry[],
  state: GalleryFilterState,
): GalleryEntry[] {
  const query = normalized(state.query);
  const categories = new Set(state.categories);
  const tags = new Set(state.tags);
  return entries.filter((entry) => {
    if (categories.size > 0 && !categories.has(entry.category)) return false;
    if ([...tags].some((tag) => !entry.tags.includes(tag))) return false;
    if (query === "") return true;
    const haystack = normalized(
      [
        entry.id,
        entry.title,
        entry.description,
        entry.category,
        entry.docsSection,
        ...entry.tags,
      ].join(" "),
    );
    return query.split(" ").every((part) => haystack.includes(part));
  });
}

export function parseGalleryFilter(
  params: URLSearchParams,
  options: GalleryFilterOptions,
): { state: GalleryFilterState; reset: boolean } {
  let reset = false;
  const readKnown = (key: "category" | "tag", allowed: ReadonlySet<string>): string[] => {
    const values = uniqueSorted(params.getAll(key));
    const known = values.filter((value) => allowed.has(value));
    if (known.length !== values.length) reset = true;
    return known;
  };
  return {
    state: {
      query: params.get("q")?.trim().replaceAll(/\s+/g, " ") ?? "",
      categories: readKnown("category", options.categories),
      tags: readKnown("tag", options.tags),
    },
    reset,
  };
}

export function serializeGalleryFilter(
  state: GalleryFilterState,
  current: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const key of OWNED_KEYS) next.delete(key);
  const query = state.query.trim().replaceAll(/\s+/g, " ");
  if (query !== "") next.set("q", query);
  for (const category of uniqueSorted(state.categories)) next.append("category", category);
  for (const tag of uniqueSorted(state.tags)) next.append("tag", tag);
  return next;
}

export function rankRelatedExamples(
  currentId: string,
  entries: readonly GalleryEntry[],
  limit = 3,
): GalleryEntry[] {
  const current = entries.find((entry) => entry.id === currentId);
  if (current === undefined || limit <= 0) return [];
  const ranked = entries
    .map((entry, index) => ({
      entry,
      index,
      score:
        entry.id === currentId
          ? -1
          : (entry.category === current.category ? 2 : 0) +
            entry.tags.filter((tag) => current.tags.includes(tag)).length,
    }))
    .filter(({ score }) => score >= 0);
  const hasOverlap = ranked.some(({ score }) => score > 0);
  return ranked
    .toSorted((left, right) =>
      hasOverlap ? right.score - left.score || left.index - right.index : left.index - right.index,
    )
    .slice(0, limit)
    .map(({ entry }) => entry);
}
