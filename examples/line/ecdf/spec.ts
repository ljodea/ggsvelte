import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { ecdfSample } from "./data.js";

export default defineExample(
  // ggplot2 stat_ecdf with geom step (hv). ggsvelte uses line + curve step-hv
  // until geom_step lands; F̂ is right-continuous stairs from pad at y=0.
  gg(ecdfSample, aes({ x: "x" }))
    .geomLine({ stat: "ecdf", curve: "step-hv", linewidth: 1.8, pad: true })
    .theme("classic")
    .labs({
      title: "Empirical CDF",
      subtitle: "stat ecdf + curve step-hv (horizontal then vertical)",
      x: "x",
      y: "F̂(x)",
    })
    .spec(),
);
