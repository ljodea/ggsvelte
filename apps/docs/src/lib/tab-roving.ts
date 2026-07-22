/**
 * Roving tabindex index for horizontal/vertical tablists (Arrow keys, Home, End).
 * Returns null when the key is not a tab-navigation key or the tablist is empty.
 */
export function nextRovingTabIndex(key: string, index: number, count: number): number | null {
  if (count <= 0) return null;
  if (key === "ArrowRight" || key === "ArrowDown") return (index + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}
