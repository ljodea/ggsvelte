/**
 * The getting-started lesson, as data.
 *
 * One chart is built across progressive renders: a plain scatter of 838 Kyoto
 * cherry-blossom observations, then steps that each add one grammar element.
 * Every step declares two deltas — the PortableSpec the live chart renders
 * from, and the Svelte source the reader copies — and `foldSakura` accumulates
 * both. The page never re-derives either, so the chart on screen, the fragment
 * beside it, and the finished file at the end cannot drift (asserted in
 * scripts/sakura-lesson.test.ts).
 *
 * Shared byte-for-byte by the docs site, the llms surfaces, and the packed
 * consumer-compat fixture app.
 *
 * Implementation is split for maintainability:
 * - `scripts/quickstart/steps.ts` — lesson constants, types, SAKURA_STEPS
 * - `scripts/quickstart/fold.ts` — foldSakura accumulation
 * - `scripts/quickstart/surface.ts` — page headings, title/aria, agent fragments
 *
 * Consumers keep importing from this module (`$scripts/quickstart`,
 * `./quickstart.ts`). Do not add `scripts/quickstart/index.ts` (extensionless
 * `./quickstart` would resolve to the directory).
 */

export {
  QUICKSTART_PAGE_FILENAME,
  SAKURA_BINWIDTH,
  SAKURA_BASELINE,
  SAKURA_Y_BREAKS,
  SAKURA_Y_LAB,
  SAKURA_EPOCHS,
  SAKURA_RECORDS,
  SAKURA_STEPS,
} from "./quickstart/steps";
export type { SakuraSpecDelta, SakuraSourceDelta, SakuraStep } from "./quickstart/steps";

export {
  SAKURA_ANNOTATION_LAYERS,
  foldSakura,
  QUICKSTART_PAGE_SVELTE,
  SAKURA_FINISHED_SVELTE,
} from "./quickstart/fold";
export type { SakuraRow, SakuraFold, FoldSakuraOptions } from "./quickstart/fold";

export {
  GETTING_STARTED_PAGE_HEADINGS,
  quickstartAriaLabel,
  finishedPortableSpecNamed,
  QUICKSTART_BUILDER_FRAGMENT,
  QUICKSTART_PORTABLE_SPEC_FRAGMENT,
  QUICKSTART_HEADLESS_FRAGMENT,
  QUICKSTART_CLI_FRAGMENT,
} from "./quickstart/surface";
