import { bundleScatterCanvas } from "../adapters/ggsvelte-canvas";
import { makeScatter } from "../scenarios";

export const out = bundleScatterCanvas(makeScatter(1000));
