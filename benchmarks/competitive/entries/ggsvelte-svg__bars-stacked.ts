import { bundleBarsSvg } from "../adapters/ggsvelte-svg";
import { makeStackedBars } from "../scenarios";

export const out = bundleBarsSvg(makeStackedBars(50, 4));
