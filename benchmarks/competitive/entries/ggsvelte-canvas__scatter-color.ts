import { registerBasicPoints, registerOrdinalColor } from "@ggsvelte/core/headless/register";

import { bundleScatterCanvas } from "../adapters/ggsvelte-canvas";

registerBasicPoints();
registerOrdinalColor();
import { makeScatter } from "../scenarios";

export const out = bundleScatterCanvas(makeScatter(1000));
