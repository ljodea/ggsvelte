/**
 * The sakura lesson fold, as data.
 *
 * One chart is built across progressive renders: a plain scatter of 838 Kyoto
 * cherry-blossom observations, then steps that each add one grammar element.
 * Every step declares two deltas — PortableSpec and Svelte source — and
 * `foldSakura` accumulates both so the finished file, PortableSpec JSON, and
 * agent snippets cannot drift (asserted in scripts/sakura-lesson.test.ts).
 *
 * Shared by the getting-started guide markdown, the llms surfaces, and the
 * packed consumer-compat fixture app.
 *
 * Implementation is split for maintainability:
 * - `scripts/quickstart/steps.ts` — lesson constants, types, SAKURA_STEPS
 * - `scripts/quickstart/fold.ts` — foldSakura accumulation
 * - `scripts/quickstart/surface.ts` — agent-surface fragments for guide/llms
 *
 * Consumers keep importing from this module (`$scripts/quickstart`,
 * `./quickstart.ts`). Do not add `scripts/quickstart/index.ts` (extensionless
 * `./quickstart` would resolve to the directory).
 */

export {
  QUICKSTART_PAGE_FILENAME,
  SAKURA_TREND_WINDOW,
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
  finishedPortableSpecNamed,
  QUICKSTART_BUILDER_FRAGMENT,
  QUICKSTART_PORTABLE_SPEC_FRAGMENT,
  QUICKSTART_HEADLESS_FRAGMENT,
  QUICKSTART_CLI_FRAGMENT,
} from "./quickstart/surface";
