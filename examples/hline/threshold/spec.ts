import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { earthDensity } from "./data.js";

export default defineExample(
  // geom_hline is sugar for rule + yintercept annotation (#818).
  gg(earthDensity, aes({ x: "trial", y: "density" }))
    .geomLine({ linewidth: 1.4 })
    .geomPoint({ size: 2.5 })
    .geomHline({
      yintercept: 5.517,
      linewidth: 1,
      alpha: 0.7,
      aes: aes({ color: { value: "#888888" } }),
    })
    .theme("tufte")
    .labs({
      title: "A horizontal rule at a known value",
      subtitle: "Twenty-nine density readings with a line at the modern earth density 5.517",
      x: "Determination",
      y: "Density of the earth (water = 1)",
    })
    .spec(),
);
