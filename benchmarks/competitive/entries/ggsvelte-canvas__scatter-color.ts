import { registerBasicPoints } from "@ggsvelte/core/headless/register";

import { bundleScatterCanvas } from "../adapters/ggsvelte-canvas";

registerBasicPoints();
import { makeScatter } from "../scenarios";

export const out = bundleScatterCanvas(makeScatter(1000));
