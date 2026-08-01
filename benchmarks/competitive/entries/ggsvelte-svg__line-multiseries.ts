import { bundleLineSvg } from "../adapters/ggsvelte-svg";
import { makeMultiSeries } from "../scenarios";

export const out = bundleLineSvg(makeMultiSeries(3, 1000));
