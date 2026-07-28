import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { soporifics } from "./data.js";

export default defineExample(
  // y = x is the null the chart is testing: on it the two drugs did the same
  // for that patient, above it hyoscine won. geom_abline clips to the panel.
  gg(soporifics, aes({ x: "hyoscyamine", y: "hyoscine" }))
    .geomAbline({ slope: 1, intercept: 0, linewidth: 1.2 })
    .geomPoint({ size: 3.5 })
    .theme("minimal")
    .labs({
      title: "One drug beat the other for ten of eleven patients",
      subtitle: "Cushny and Peebles, 1905: points above the line slept longer on hyoscine",
      x: "Extra sleep on L-hyoscyamine (hours)",
      y: "Extra sleep on L-hyoscine (hours)",
    })
    .spec(),
);
