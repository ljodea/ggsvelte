import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { earthDensity } from "./data.js";

export default defineExample(
  // geom_vline is sugar for rule + xintercept annotation (#818).
  gg(earthDensity, aes({ x: "trial", y: "density" }))
    .geomLine({ linewidth: 1.4 })
    .geomPoint({ size: 2.5 })
    .geomVline({
      xintercept: 6.5,
      aes: aes({ color: { value: "#d4615c" } }),
    })
    .theme("tufte")
    .labs({
      title: "A vertical rule at a known index",
      subtitle:
        "Determinations in reported order; the rule marks the trial after which the wire changed",
      x: "Determination",
      y: "Density of the earth (water = 1)",
    })
    .spec(),
);
