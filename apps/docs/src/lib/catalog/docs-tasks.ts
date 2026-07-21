export interface DocsTask {
  label: string;
  description: string;
  hrefs: readonly [string, ...string[]];
}

export const DOCS_TASKS = [
  {
    label: "Getting started",
    description: "Install @ggsvelte/svelte and render one chart from a Svelte file.",
    hrefs: ["/guide/getting-started"],
  },
  {
    label: "Scales, themes, color",
    description: "Axes, legends, chart themes, and categorical or sequential color.",
    hrefs: ["/guide/scales-guides", "/guide/themes-color"],
  },
  {
    label: "Interaction",
    description: "Inspect, pin, select, zoom, and linked semantic state.",
    hrefs: ["/guide/inspect-pin"],
  },
  {
    label: "Layout and export",
    description: "Container sizing, SVG/canvas rendering, SSR, and headless SVG.",
    hrefs: ["/guide/responsive-charts", "/guide/server-rendering-export"],
  },
  {
    label: "Diagnostics",
    description: "Validation, render, interaction, and CLI error codes.",
    hrefs: ["/guide/errors"],
  },
] as const satisfies readonly DocsTask[];
