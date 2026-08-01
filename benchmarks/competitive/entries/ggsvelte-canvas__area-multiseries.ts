import { bundleAreaCanvas } from "../adapters/ggsvelte-canvas";
import { makeMultiSeries } from "../scenarios";

export const out = bundleAreaCanvas(makeMultiSeries(3, 1000));
