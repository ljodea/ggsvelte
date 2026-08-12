import { registerBasicAreas } from "@ggsvelte/core/headless/register";

import { bundleAreaCanvas } from "../adapters/ggsvelte-canvas";

registerBasicAreas();
import { makeMultiSeries } from "../scenarios";

export const out = bundleAreaCanvas(makeMultiSeries(3, 1000));
