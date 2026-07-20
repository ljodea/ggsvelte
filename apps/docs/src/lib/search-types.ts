export type DocsSearchKind =
  | "page"
  | "heading"
  | "example"
  | "api"
  | "diagnostic"
  | "cli"
  | "lifecycle";

export interface DocsSearchEntry {
  id: string;
  kind: DocsSearchKind;
  title: string;
  summary: string;
  href: string;
  keywords: readonly string[];
  exact: readonly string[];
}
