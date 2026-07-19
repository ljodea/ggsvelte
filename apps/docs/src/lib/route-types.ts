export type DocsRouteKind = "page" | "alias" | "endpoint" | "performance";
export type DocsShell = "site" | "docs";

export interface RouteNavigation {
  section: string;
  label: string;
  order: number;
}

export interface RouteHeading {
  id: string;
  title: string;
  level: number;
}

export interface DocsRouteMetadata {
  path: string;
  title: string;
  description: string;
  canonicalPath: string;
  kind: DocsRouteKind;
  index: boolean;
  sitemap: boolean;
  shell: DocsShell;
  navigation?: RouteNavigation;
  headings?: RouteHeading[];
}

export interface GuideNavigationGroup {
  section: string;
  entries: readonly { path: string; label: string }[];
}
