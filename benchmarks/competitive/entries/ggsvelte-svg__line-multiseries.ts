import { registerBasicLines } from "@ggsvelte/core/headless/register";

import { bundleLineSvg } from "../adapters/ggsvelte-svg";

registerBasicLines();
import { makeMultiSeries } from "../scenarios";

export const out = bundleLineSvg(makeMultiSeries(3, 1000));
