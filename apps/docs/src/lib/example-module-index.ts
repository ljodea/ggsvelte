/**
 * O(1) lookup over Vite `import.meta.glob` tables keyed by example id
 * (`category/name`). Replaces linear `Object.keys(table).find(endsWith)`
 * scans used when resolving every corpus entry (llms-full) or a single
 * example page load.
 */

/**
 * Extract `category/name` from a glob key when it ends with `/${leaf}`.
 * Returns null when the path is not a two-segment example module for that leaf.
 */
export function exampleIdFromGlobKey(path: string, leaf: string): string | null {
  const suffix = `/${leaf}`;
  if (!path.endsWith(suffix)) return null;
  const withoutLeaf = path.slice(0, -suffix.length);
  const parts = withoutLeaf.split("/").filter((segment) => segment.length > 0);
  if (parts.length < 2) return null;
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

/**
 * Build a Map from example id → module. Walks `Object.keys` once and keeps
 * the first entry for each id (same winner as `Array.find` on key order).
 */
export function indexExampleModulesById<T>(table: Record<string, T>, leaf: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const key of Object.keys(table)) {
    const id = exampleIdFromGlobKey(key, leaf);
    if (id === null || map.has(id)) continue;
    map.set(id, table[key]!);
  }
  return map;
}

/**
 * O(1) require for a previously indexed glob table.
 * Error text keeps the historical `*${suffix}` shape for logs/tests.
 */
export function requireExampleModule<T>(
  map: Map<string, T>,
  id: string,
  leaf: string,
  label = "example module",
): T {
  const value = map.get(id);
  if (value === undefined) {
    throw new Error(`${label} not found: */${id}/${leaf} (manifest out of sync with the tree?)`);
  }
  return value;
}
