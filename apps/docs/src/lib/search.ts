import type { DocsSearchEntry, DocsSearchKind } from "./search-types.js";

const KIND_PRIORITY: Record<DocsSearchKind, number> = {
  diagnostic: 80,
  api: 80,
  cli: 80,
  page: 70,
  heading: 70,
  example: 40,
  lifecycle: 30,
};

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .trim()
    .replaceAll(/\s+/g, " ");
}

function includesToken(haystack: string, token: string): boolean {
  return haystack.includes(token);
}

/**
 * Pre-normalized fields for one search entry. Built once per entries array
 * identity so keystrokes do not re-run NFKD / diacritic / lower work over the
 * full index (n ≈ thousands and grows with the docs surface).
 */
type PreparedEntry<Entry extends DocsSearchEntry> = {
  entry: Entry;
  title: string;
  exact: readonly string[];
  titleAndExact: string;
  broad: string;
};

const preparedCache = new WeakMap<object, PreparedEntry<DocsSearchEntry>[]>();

function prepareEntry<Entry extends DocsSearchEntry>(entry: Entry): PreparedEntry<Entry> {
  const title = normalize(entry.title);
  const exact = entry.exact.map(normalize);
  const titleAndExact = [title, ...exact].join(" ");
  const broad = normalize(
    [entry.title, entry.summary, ...entry.keywords, ...entry.exact].join(" "),
  );
  return { entry, title, exact, titleAndExact, broad };
}

function preparedFor<Entry extends DocsSearchEntry>(
  entries: readonly Entry[],
): readonly PreparedEntry<Entry>[] {
  const cached = preparedCache.get(entries as object);
  if (cached !== undefined) {
    return cached as PreparedEntry<Entry>[];
  }
  const prepared = entries.map((entry) => prepareEntry(entry));
  preparedCache.set(entries as object, prepared as PreparedEntry<DocsSearchEntry>[]);
  return prepared;
}

function scorePrepared(
  query: string,
  tokens: readonly string[],
  prepared: PreparedEntry<DocsSearchEntry>,
): number {
  const { title, exact, titleAndExact, broad } = prepared;
  if (title !== query && exact.includes(query)) return 1100;
  if (title === query || exact.includes(query)) return 1000;
  if (title.startsWith(query) || exact.some((term) => term.startsWith(query))) return 900;
  if (tokens.every((token) => includesToken(titleAndExact, token))) return 800;
  if (tokens.every((token) => includesToken(broad, token))) return 600;
  return 0;
}

export function searchDocs<Entry extends DocsSearchEntry>(
  queryInput: string,
  entries: readonly Entry[],
  limit = 12,
): Entry[] {
  const query = normalize(queryInput);
  if (query === "" || limit <= 0) return [];
  const tokens = query.split(" ");
  const prepared = preparedFor(entries);
  const ranked = prepared
    .map((item, order) => ({
      entry: item.entry,
      order,
      score: scorePrepared(query, tokens, item),
    }))
    .filter((candidate) => candidate.score > 0)
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        KIND_PRIORITY[right.entry.kind] - KIND_PRIORITY[left.entry.kind] ||
        left.order - right.order,
    );

  const hrefs = new Set<string>();
  const results: Entry[] = [];
  for (const candidate of ranked) {
    if (hrefs.has(candidate.entry.href)) continue;
    hrefs.add(candidate.entry.href);
    results.push(candidate.entry);
    if (results.length === limit) break;
  }
  return results;
}
