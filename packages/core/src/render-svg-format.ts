/**
 * Deterministic SVG number formatting and XML escaping for the pure renderer.
 * Internal helpers — not part of the package public API.
 */

/** Deterministic pixel formatting: 2 decimals, no trailing zeros, no -0. */
export function px(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
}

export function escapeXML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
