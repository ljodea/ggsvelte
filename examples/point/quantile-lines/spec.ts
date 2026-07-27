import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { fanningScatter } from "./data.js";

export default defineExample(
  // Linear RQ lines at the default 0.25 / 0.5 / 0.75 quantiles of y | x.
  gg(fanningScatter, aes({ x: "x", y: "y" }))
    .geomPoint({ alpha: 0.55, size: 2.5 })
    .geomQuantile({ linewidth: 1.4 })
    .theme("classic")
    .labs({
      title: "Quantile regression lines",
      subtitle: "Linear y ~ x at τ = 0.25, 0.5, 0.75 (ggplot2 geom_quantile)",
      x: "x",
      y: "y",
    })
    .spec(),
);
