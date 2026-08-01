import { bundleAreaSvg } from "../adapters/ggsvelte-svg";
import { makeMultiSeries } from "../scenarios";

export const out = bundleAreaSvg(makeMultiSeries(3, 1000));
