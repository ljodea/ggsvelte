import { registerBasicLines, registerDefaultOrdinalColor } from "@ggsvelte/core/headless/register";

import { bundleLineCanvas } from "../adapters/ggsvelte-canvas";

registerBasicLines();
registerDefaultOrdinalColor();
import { makeMultiSeries } from "../scenarios";

export const out = bundleLineCanvas(makeMultiSeries(3, 1000));
