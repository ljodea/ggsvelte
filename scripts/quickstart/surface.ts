/**
 * Docs / agent surface derived from the sakura lesson.
 *
 * Page headings, aria extractors, and the agent-surface fragments.
 * Not part of the human walkthrough fold — see GettingStartedGuide and llms.
 */

import type { PortableSpec } from "@ggsvelte/spec";

import { foldSakura, QUICKSTART_PAGE_SVELTE } from "./fold";
import { SAKURA_BINWIDTH, SAKURA_STEPS } from "./steps";

/**
 * Section headings of the HUMAN getting-started page, in page order.
 *
 * `/guide/getting-started` is the one route whose prose is a Svelte component
 * rather than guide markdown (the markdown at that slug is the agent doc, which
 * is deliberately a different document — see D6 in the overhaul plan). Its
 * on-this-page navigation is generated from this list, and
 * scripts/getting-started-headings.test.ts asserts the component really renders
 * each id.
 */
export const GETTING_STARTED_PAGE_HEADINGS = [
  { id: "install", title: "Install", level: 2 },
  { id: "start-with-a-basic-plot", title: "Start with a basic plot", level: 2 },
  { id: "add-layers", title: "Add layers", level: 2 },
  ...SAKURA_STEPS.map((step) => ({ id: step.id, title: step.title, level: 3 as const })),
  { id: "the-finished-file", title: "The finished file", level: 2 },
  { id: "agent-json-spec", title: "Agent JSON spec", level: 2 },
  { id: "where-next", title: "Where next", level: 2 },
] as const satisfies readonly { id: string; title: string; level: 2 | 3 }[];

/** The chart's accessible name, read from the file itself. */
export function quickstartAriaLabel(): string {
  const match = /ariaLabel="([^"]+)"/.exec(QUICKSTART_PAGE_SVELTE);
  if (match === null) throw new Error("quickstart page has no ariaLabel");
  return match[1]!;
}

// --- the agent surface -----------------------------------------------------
// These live on /llms.txt and in the "Built for agents" section, not in the
// human walkthrough: their audience is code that emits specs, not a reader
// following along in an editor.

export const QUICKSTART_BUILDER_FRAGMENT = `import { aes, gg } from "@ggsvelte/svelte";
import { kyotoSakura } from "@ggsvelte/svelte/data";

const spec = gg(kyotoSakura, aes({ x: "year", y: "bloomDate" }))
  .geomPoint()
  .geomLine({
    stat: "summary_bin",
    fun: "median",
    binwidth: ${SAKURA_BINWIDTH},
    curve: "step-hv",
  })
  .spec();`;

/**
 * Finished lesson chart as PortableSpec JSON for agents.
 *
 * Derived from `foldSakura(SAKURA_STEPS.length)` so layers, scales, theme, and
 * guides cannot drift from the finished Svelte file or the live chart. Plot
 * data is a named ref (`kyotoSakura`) — hosts resolve it from
 * `@ggsvelte/svelte/data`. Small annotation tables (epochs, records) stay as
 * inline `values` because they are chart decoration, not the 838-row series.
 * `key` / `inspect` are GGPlot host props, not PortableSpec fields.
 */
export function finishedPortableSpecNamed(): PortableSpec {
  const { spec } = foldSakura(SAKURA_STEPS.length);
  return {
    ...spec,
    data: { name: "kyotoSakura" },
  };
}

/**
 * Pretty-printed finished PortableSpec. Same object as
 * {@link finishedPortableSpecNamed} — string form for copy blocks / llms.
 */
export const QUICKSTART_PORTABLE_SPEC_FRAGMENT = `${JSON.stringify(
  finishedPortableSpecNamed(),
  null,
  2,
)}\n`;

export const QUICKSTART_HEADLESS_FRAGMENT = `import { renderToSVGString } from "@ggsvelte/core";

const svg = renderToSVGString(spec, { width: 900, height: 360 });`;

export const QUICKSTART_CLI_FRAGMENT = "ggsvelte-render spec.json > chart.svg 2> diagnostics.jsonl";
