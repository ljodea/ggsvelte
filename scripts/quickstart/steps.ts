/**
 * SAKURA_STEPS — the lesson's steps, composed in order.
 *
 * Composition order is load-bearing: `foldSakura` (`./fold.ts`) folds this
 * array front to back, and a repeated key's LAST writer wins — the final
 * step re-supplies labs and restates `childOrder`, so reordering changes
 * both the fold and the emitted source.
 *
 * The steps, one file each:
 * - `./steps-signal.ts` — theme, trend, chartlines, y-tick polish
 * - `./steps-epochs.ts` — epoch bands, names, fill scale
 * - `./steps-annotations.ts` — baseline, rings, callouts
 * - `./steps-finish.ts` — key + Inspect
 *
 * Layer ontology: a step's grammar children (theme/scales/labs/guides/
 * inspect) **are** plot layers — held apart from mark children only because
 * they are not mark layers; see `SakuraSourceDelta` in `./model.ts`.
 *
 * Pure data — the fold that accumulates steps lives in `./fold.ts`.
 */

import type { SakuraStep } from "./model";
import { ANNOTATE_STEP } from "./steps-annotations";
import { EPOCHS_STEP } from "./steps-epochs";
import { FINISH_STEP } from "./steps-finish";
import { SIGNAL_STEP } from "./steps-signal";

export {
  SAKURA_BASELINE,
  SAKURA_EPOCHS,
  SAKURA_RECORDS,
  SAKURA_TREND_WINDOW,
  SAKURA_Y_BREAKS,
  SAKURA_Y_LAB,
  QUICKSTART_PAGE_FILENAME,
} from "./sakura-data";
export type { SakuraSpecDelta, SakuraSourceDelta, SakuraStep } from "./model";

export const SAKURA_STEPS: readonly SakuraStep[] = [
  SIGNAL_STEP,
  EPOCHS_STEP,
  ANNOTATE_STEP,
  FINISH_STEP,
];
