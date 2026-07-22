/**
 * Docs site light/dark appearance (data-theme on <html>).
 * Bootstrap first-paint logic lives in static/theme.js and must use the same
 * storage key string as DOCS_THEME_STORAGE_KEY.
 */
export type DocsAppearance = "light" | "dark";

export const DOCS_THEME_STORAGE_KEY = "ggsvelte-theme";

export type DocsAppearanceStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function readDocsAppearance(
  root: { dataset: DOMStringMap } = document.documentElement,
): DocsAppearance {
  return root.dataset.theme === "dark" ? "dark" : "light";
}

export function toggleDocsAppearance(current: DocsAppearance): DocsAppearance {
  return current === "dark" ? "light" : "dark";
}

function resolveDocsAppearanceStorage(
  storage: DocsAppearanceStorage | null | undefined,
): DocsAppearanceStorage | null {
  if (storage !== undefined) return storage;
  // Accessing `localStorage` can throw (opaque origins); keep that inside try.
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Apply appearance to the document root. Always sets data-theme; storage writes
 * are best-effort (toggle still works when localStorage is unavailable).
 */
export function writeDocsAppearance(
  appearance: DocsAppearance,
  root: { dataset: DOMStringMap } = document.documentElement,
  storage?: DocsAppearanceStorage | null,
): void {
  root.dataset.theme = appearance;
  const store = resolveDocsAppearanceStorage(storage);
  if (store === null) return;
  try {
    store.setItem(DOCS_THEME_STORAGE_KEY, appearance);
  } catch {
    // In-page control still works when storage is unavailable.
  }
}

/** Observe data-theme changes on the document root; returns unsubscribe. */
export function watchDocsAppearance(
  onChange: (appearance: DocsAppearance) => void,
  root: HTMLElement = document.documentElement,
): () => void {
  const observer = new MutationObserver(() => {
    onChange(readDocsAppearance(root));
  });
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => {
    observer.disconnect();
  };
}
