import type { DocsSearchEntry } from "./search-types.js";

type SearchIndexModule = {
  DOCS_SEARCH_INDEX: readonly DocsSearchEntry[];
};

type SearchIndexImporter = () => Promise<SearchIndexModule>;

const defaultImporter: SearchIndexImporter = () =>
  import("./generated/search-index.js") as Promise<SearchIndexModule>;

let pending: Promise<readonly DocsSearchEntry[]> | undefined;

/**
 * Load the generated docs search index once (dynamic import) and reuse it.
 * Ordinary docs navigations must not pay for this module until search opens.
 */
export function loadDocsSearchIndex(
  importer: SearchIndexImporter = defaultImporter,
): Promise<readonly DocsSearchEntry[]> {
  if (pending === undefined) {
    pending = importer()
      .then((module) => module.DOCS_SEARCH_INDEX)
      .catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
  }
  return pending;
}

/** Test-only: drop the cached promise between cases. */
export function resetDocsSearchIndexLoaderForTests(): void {
  pending = undefined;
}
