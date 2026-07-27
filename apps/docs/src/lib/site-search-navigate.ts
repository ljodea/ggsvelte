/**
 * Full-document navigation for SiteSearch.
 * Isolated so component tests can mock without touching non-configurable
 * `window.location` in Playwright (issue #991).
 */
export function assignDocsLocation(href: string): void {
  window.location.assign(href);
}
