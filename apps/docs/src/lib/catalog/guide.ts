export const GUIDE_SECTIONS = ["Start", "Build", "Reference", "Release"] as const;
export type GuideSection = (typeof GUIDE_SECTIONS)[number];

export interface GuideCatalogEntry {
  slug: string;
  title: string;
  description: string;
  section: GuideSection;
}

/** User-facing guide identity and ordering. Guide prose remains catalog-generated. */
export const GUIDE_CATALOG = [
  {
    slug: "getting-started",
    title: "Getting started",
    description: "Install ggsvelte and build one complete responsive, accessible Svelte chart.",
    section: "Start",
  },
  {
    slug: "interactions",
    title: "Interactions",
    description: "Inspection, selection, zoom, keyboard behavior, identity, and event contracts.",
    section: "Build",
  },
  {
    slug: "compatibility",
    title: "Compatibility",
    description: "Tested Node, Svelte, package-manager, browser, and OS boundaries.",
    section: "Build",
  },
  {
    slug: "interaction-reference",
    title: "Interaction reference",
    description: "Search interaction props, callbacks, event phases, and diagnostic codes.",
    section: "Reference",
  },
  {
    slug: "errors",
    title: "Errors reference",
    description:
      "Understand validation, render, interaction, and CLI diagnostics and recover safely.",
    section: "Reference",
  },
  {
    slug: "advisories",
    title: "Advisories",
    description: "Spec-lint advisories and the pipeline's disclosed heuristics.",
    section: "Reference",
  },
  {
    slug: "lifecycle",
    title: "Lifecycle & editions",
    description: "API stability tags per export, and the defaults-edition mechanism.",
    section: "Reference",
  },
  {
    slug: "migrating-pre-0-1",
    title: "Migrating pre-0.1 interactions",
    description: "Move from tooltip and brush props to semantic interaction capabilities.",
    section: "Release",
  },
  {
    slug: "upgrading",
    title: "Upgrading ggsvelte",
    description: "Per-release upgrade notes: what changed, what is optional, what to replace.",
    section: "Release",
  },
] as const satisfies readonly GuideCatalogEntry[];

export type GuideSlug = (typeof GUIDE_CATALOG)[number]["slug"];
