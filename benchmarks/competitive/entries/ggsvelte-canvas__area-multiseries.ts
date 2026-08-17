import { registerBasicAreas, registerDefaultOrdinalColor } from "@ggsvelte/core/headless/register";

import { bundleAreaCanvas } from "../adapters/ggsvelte-canvas";

registerBasicAreas();
registerDefaultOrdinalColor();
import { makeMultiSeries } from "../scenarios";

export const out = bundleAreaCanvas(makeMultiSeries(3, 1000));
