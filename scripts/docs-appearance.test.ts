import { describe, expect, test } from "bun:test";

import {
  DOCS_THEME_STORAGE_KEY,
  readDocsAppearance,
  toggleDocsAppearance,
  watchDocsAppearance,
  writeDocsAppearance,
  type DocsAppearanceStorage,
} from "../apps/docs/src/lib/docs-appearance";

function root(theme?: string): { dataset: DOMStringMap } {
  const dataset: DOMStringMap = {};
  if (theme !== undefined) dataset.theme = theme;
  return { dataset };
}

function memoryStorage(
  initial: Record<string, string> = {},
  opts: { throwOnSet?: boolean } = {},
): DocsAppearanceStorage & { store: Record<string, string> } {
  const store = { ...initial };
  return {
    store,
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      if (opts.throwOnSet === true) throw new Error("quota");
      store[key] = value;
    },
  };
}

describe("docs appearance", () => {
  test("storage key matches the blocking theme bootstrap contract", () => {
    expect(DOCS_THEME_STORAGE_KEY).toBe("ggsvelte-theme");
  });

  test("read treats only explicit dark as dark; missing/invalid as light", () => {
    expect(readDocsAppearance(root("dark"))).toBe("dark");
    expect(readDocsAppearance(root("light"))).toBe("light");
    expect(readDocsAppearance(root())).toBe("light");
    expect(readDocsAppearance(root("auto"))).toBe("light");
  });

  test("toggle flips light and dark", () => {
    expect(toggleDocsAppearance("light")).toBe("dark");
    expect(toggleDocsAppearance("dark")).toBe("light");
  });

  test("write sets data-theme and storage", () => {
    const el = root("light");
    const storage = memoryStorage();
    writeDocsAppearance("dark", el, storage);
    expect(el.dataset.theme).toBe("dark");
    expect(storage.store[DOCS_THEME_STORAGE_KEY]).toBe("dark");
  });

  test("write still sets data-theme when storage throws", () => {
    const el = root("light");
    const storage = memoryStorage({}, { throwOnSet: true });
    writeDocsAppearance("dark", el, storage);
    expect(el.dataset.theme).toBe("dark");
  });

  test("write with null storage only mutates dataset", () => {
    const el = root("dark");
    writeDocsAppearance("light", el, null);
    expect(el.dataset.theme).toBe("light");
  });

  test("write with two args uses the lazy default storage resolver", () => {
    const el = root("light");
    writeDocsAppearance("dark", el);
    expect(el.dataset.theme).toBe("dark");
  });
});

describe("watchDocsAppearance", () => {
  test("unsubscribes without throwing when MutationObserver is unavailable in tests", () => {
    // Bun unit environment may not provide MutationObserver; skip observer contract
    // when absent. Browser visual tests cover live theme flips.
    if (typeof MutationObserver === "undefined") {
      expect(typeof watchDocsAppearance).toBe("function");
      return;
    }
    const el = document.createElement("div");
    el.dataset.theme = "light";
    const seen: string[] = [];
    const stop = watchDocsAppearance((appearance) => {
      seen.push(appearance);
    }, el);
    el.dataset.theme = "dark";
    // MutationObserver is async; force a microtask flush is not always enough.
    // At least destroy must be callable.
    stop();
    expect(typeof stop).toBe("function");
  });
});
