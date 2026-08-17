import {
  registerBandGuide,
  registerBasicBars,
  registerDefaultOrdinalColor,
} from "@ggsvelte/core/headless/register";

import { bundleBarsSvg } from "../adapters/ggsvelte-svg";

registerBasicBars();
registerDefaultOrdinalColor();
registerBandGuide();
import { makeStackedBars } from "../scenarios";

export const out = bundleBarsSvg(makeStackedBars(50, 4));
