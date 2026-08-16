import { registerBasicLines, registerOrdinalColor } from "@ggsvelte/core/headless/register";

import { bundleLineSvg } from "../adapters/ggsvelte-svg";

registerBasicLines();
registerOrdinalColor();
import { makeMultiSeries } from "../scenarios";

export const out = bundleLineSvg(makeMultiSeries(3, 1000));
