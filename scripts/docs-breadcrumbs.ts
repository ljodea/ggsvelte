/**
 * Visible docs/reference breadcrumb trail — shared by DocsShell UI and SEO
 * BreadcrumbList structured data so they cannot drift.
 */

export type DocsCrumb = {
  label: string;
  /** Omit href (or leave undefined) for the current page. */
  href?: string;
};

/** Intermediate /reference/<section> labels for child detail pages. */
const REFERENCE_SECTION_LABELS: Readonly<Record<string, string>> = Object.freeze({
  geoms: "Geoms",
  stats: "Stats",
  positions: "Positions",
  interactions: "Interactions",
  cli: "CLI",
  scales: "Scales",
  palettes: "Palettes",
  themes: "Themes",
  guides: "Guides",
  axes: "Axes",
  labels: "Labels",
  labs: "Labs",
});

/**
 * Build breadcrumb crumbs for a docs or reference path.
 *
 * Reference detail pages include the section index:
 *   Reference / Scales / ScaleYLog10
 * Guide pages stay two-level:
 *   Docs / Getting started
 */
export function buildDocsCrumbs(
  currentPath: string,
  title: string,
  isReference: boolean,
): readonly DocsCrumb[] {
  const root: DocsCrumb = {
    label: isReference ? "Reference" : "Docs",
    href: isReference ? "/reference" : "/docs",
  };

  if (!isReference) {
    if (currentPath === "/docs" || currentPath === "/docs/") {
      return [{ label: "Docs" }];
    }
    return [root, { label: title }];
  }

  if (currentPath === "/reference" || currentPath === "/reference/") {
    return [{ label: "Reference" }];
  }

  const segments = currentPath.replaceAll(/^\/+|\/+$/g, "").split("/");
  // ["reference", "geoms"] or ["reference", "geoms", "col"]
  if (segments[0] !== "reference" || segments.length < 2) {
    return [root, { label: title }];
  }

  const section = segments[1] ?? "";
  const sectionLabel = REFERENCE_SECTION_LABELS[section];
  if (sectionLabel === undefined) {
    return [root, { label: title }];
  }

  const sectionHref = `/reference/${section}`;
  if (segments.length === 2) {
    return [root, { label: sectionLabel }];
  }

  // Detail page: Reference / Geoms / GeomCol (title already component name)
  return [root, { label: sectionLabel, href: sectionHref }, { label: title }];
}
