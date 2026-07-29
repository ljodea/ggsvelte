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
type PreparedEntry = {
  entry: DocsSearchEntry;
  title: string;
  exact: readonly string[];
  titleAndExact: string;
  broad: string;
};

const preparedCache = new WeakMap<object, PreparedEntry[]>();

function prepareEntry(entry: DocsSearchEntry): PreparedEntry {
  const title = normalize(entry.title);
  const exact = entry.exact.map(normalize);
  const titleAndExact = [title, ...exact].join(" ");
  const broad = normalize(
    [entry.title, entry.summary, ...entry.keywords, ...entry.exact].join(" "),
  );
  return { entry, title, exact, titleAndExact, broad };
}

function preparedFor(entries: readonly DocsSearchEntry[]): PreparedEntry[] {
  const cached = preparedCache.get(entries);
  if (cached !== undefined) return cached;
  const prepared: PreparedEntry[] = [];
  for (const entry of entries) {
    prepared.push(prepareEntry(entry));
  }
  preparedCache.set(entries, prepared);
  return prepared;
}

function scorePrepared(query: string, tokens: readonly string[], prepared: PreparedEntry): number {
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
  // Prepared rows keep the same order as `entries`; reclaim Entry via index.
  const prepared = preparedFor(entries);
  const scored: { order: number; score: number; kind: DocsSearchKind }[] = [];
  for (let order = 0; order < prepared.length; order += 1) {
    const item = prepared[order];
    if (item === undefined) continue;
    const score = scorePrepared(query, tokens, item);
    if (score <= 0) continue;
    scored.push({ order, score, kind: item.entry.kind });
  }
  scored.sort(
    (left, right) =>
      right.score - left.score ||
      KIND_PRIORITY[right.kind] - KIND_PRIORITY[left.kind] ||
      left.order - right.order,
  );

  const hrefs = new Set<string>();
  const results: Entry[] = [];
  for (const candidate of scored) {
    const entry = entries[candidate.order];
    if (entry === undefined) continue;
    if (hrefs.has(entry.href)) continue;
    hrefs.add(entry.href);
    results.push(entry);
    if (results.length === limit) break;
  }
  return results;
}
