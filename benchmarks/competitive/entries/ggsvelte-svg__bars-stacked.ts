import { registerBasicBars } from "@ggsvelte/core/headless/register";

import { bundleBarsSvg } from "../adapters/ggsvelte-svg";

registerBasicBars();
import { makeStackedBars } from "../scenarios";

export const out = bundleBarsSvg(makeStackedBars(50, 4));
