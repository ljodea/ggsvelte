/**
 * Pure combobox keyboard policy for SiteSearch.
 * Callers preventDefault only when the action is not `ignore`.
 */
export type SiteSearchKeyAction =
  | { readonly type: "move"; readonly index: number }
  | { readonly type: "select" }
  | { readonly type: "close" }
  | { readonly type: "ignore" };

export function siteSearchKeyAction(
  key: string,
  activeIndex: number,
  resultCount: number,
): SiteSearchKeyAction {
  if (key === "Escape") return { type: "close" };
  if (key === "Enter") {
    return activeIndex >= 0 ? { type: "select" } : { type: "ignore" };
  }
  if (resultCount <= 0) return { type: "ignore" };

  if (key === "ArrowDown") {
    return { type: "move", index: (activeIndex + 1 + resultCount) % resultCount };
  }
  if (key === "ArrowUp") {
    return { type: "move", index: (activeIndex - 1 + resultCount) % resultCount };
  }
  if (key === "Home") return { type: "move", index: 0 };
  if (key === "End") return { type: "move", index: resultCount - 1 };
  return { type: "ignore" };
}
