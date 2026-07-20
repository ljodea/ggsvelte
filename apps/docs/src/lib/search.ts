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

function scoreEntry(query: string, tokens: readonly string[], entry: DocsSearchEntry): number {
  const title = normalize(entry.title);
  const exact = entry.exact.map(normalize);
  const titleAndExact = [title, ...exact].join(" ");
  const broad = normalize(
    [entry.title, entry.summary, ...entry.keywords, ...entry.exact].join(" "),
  );

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
  const ranked = entries
    .map((entry, order) => ({ entry, order, score: scoreEntry(query, tokens, entry) }))
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
