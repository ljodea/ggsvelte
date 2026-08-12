import { registerBasicAreas } from "@ggsvelte/core/headless/register";

import { bundleAreaSvg } from "../adapters/ggsvelte-svg";

registerBasicAreas();
import { makeMultiSeries } from "../scenarios";

export const out = bundleAreaSvg(makeMultiSeries(3, 1000));
