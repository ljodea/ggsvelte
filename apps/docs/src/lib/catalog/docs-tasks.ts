export interface DocsTask {
  label: string;
  description: string;
  hrefs: readonly [string, ...string[]];
}

export const DOCS_TASKS = [
  {
    label: "Build a chart",
    description:
      "Install one package and render a responsive, accessible chart from one Svelte file.",
    hrefs: ["/guide/getting-started"],
  },
  {
    label: "Customize it",
    description:
      "Choose scales, guides, themes, and color without changing the meaning of the data.",
    hrefs: ["/guide/scales-guides", "/guide/themes-color"],
  },
  {
    label: "Add interaction",
    description: "Add inspect-and-pin behavior with a keyboard and touch path before linked state.",
    hrefs: ["/guide/inspect-pin"],
  },
  {
    label: "Deploy it",
    description:
      "Make chart sizing predictable, then choose browser, server, or exported SVG output.",
    hrefs: ["/guide/responsive-charts", "/guide/server-rendering-export"],
  },
  {
    label: "Troubleshoot it",
    description:
      "Follow stable validation, rendering, interaction, and command-line diagnostic codes.",
    hrefs: ["/guide/errors"],
  },
] as const satisfies readonly DocsTask[];
