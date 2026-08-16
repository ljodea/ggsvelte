import {
  registerBandGuide,
  registerBasicBars,
  registerOrdinalColor,
} from "@ggsvelte/core/headless/register";

import { bundleBarsSvg } from "../adapters/ggsvelte-svg";

registerBasicBars();
registerOrdinalColor();
registerBandGuide();
import { makeStackedBars } from "../scenarios";

export const out = bundleBarsSvg(makeStackedBars(50, 4));
