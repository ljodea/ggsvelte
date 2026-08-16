import { registerBasicPoints, registerOrdinalColor } from "@ggsvelte/core/headless/register";

import { bundleScatterSvg } from "../adapters/ggsvelte-svg";

registerBasicPoints();
registerOrdinalColor();
import { makeScatter } from "../scenarios";

export const out = bundleScatterSvg(makeScatter(1000));
