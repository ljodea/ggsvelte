/**
 * Deferred svelte-highlight loader for docs code chrome.
 *
 * Static imports of svelte-highlight + language packs put ~100KB into the
 * first-paint modulepreload graph on every page that mounts CopyCode/CodeTabs.
 * Callers show plain <pre><code> until this resolves.
 */
export type HighlightBundle = {
  Highlight: (typeof import("svelte-highlight"))["default"];
  resolveCodeLanguage: (typeof import("./code-languages.js"))["resolveCodeLanguage"];
  languageFromCodeTabLabel: (typeof import("./code-languages.js"))["languageFromCodeTabLabel"];
};

let pending: Promise<HighlightBundle> | undefined;

export function loadHighlight(): Promise<HighlightBundle> {
  pending ??= Promise.all([import("svelte-highlight"), import("./code-languages.js")])
    .then(([highlight, languages]) => ({
      Highlight: highlight.default,
      resolveCodeLanguage: languages.resolveCodeLanguage,
      languageFromCodeTabLabel: languages.languageFromCodeTabLabel,
    }))
    .catch((error: unknown) => {
      // Do not cache a rejected promise — a transient chunk miss must retry.
      pending = undefined;
      throw error;
    });
  return pending;
}
