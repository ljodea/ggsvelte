/**
 * Step 4 of the sakura lesson: make it interactive.
 *
 * No title/subtitle/caption: chrome would squash the data panel. Citation
 * and the dashed-rule note live as a page footnote instead.
 */

import type { SakuraStep } from "./model";

export const FINISH_STEP: SakuraStep = {
  id: "finish-it",
  title: "Make it interactive",
  outcome: "",
  explanation: "",
  fragment: `key="year"
  <Inspect mode="exact" pin />`,
  spec: {},
  source: {
    components: ["Inspect"],
    attrs: {
      key: `  key="year"`,
    },
    grammar: {
      inspect: `  <Inspect mode="exact" pin />`,
    },
  },
};
