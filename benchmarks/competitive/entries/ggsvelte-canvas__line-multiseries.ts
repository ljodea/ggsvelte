import { bundleLineCanvas } from "../adapters/ggsvelte-canvas";
import { makeMultiSeries } from "../scenarios";

export const out = bundleLineCanvas(makeMultiSeries(3, 1000));
