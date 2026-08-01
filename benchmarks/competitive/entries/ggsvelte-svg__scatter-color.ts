import { bundleScatterSvg } from "../adapters/ggsvelte-svg";
import { makeScatter } from "../scenarios";

export const out = bundleScatterSvg(makeScatter(1000));
