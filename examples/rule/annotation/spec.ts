import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { earthDensity } from "./data.js";

export default defineExample(
  gg(earthDensity, aes({ x: "trial", y: "density" }))
    // Annotation form: fixed intercepts, inherits NO plot aes (like
    // ggplot2's geom_vline/geom_hline with inherit.aes = FALSE). Both
    // intercepts come from the source's own documentation - Cavendish refitted
    // the torsion balance with a stiffer wire after the sixth determination,
    // and the modern value of the earth's density is 5.517.
    .geomRule({ xintercept: 6.5, aes: aes({ color: { value: "#d4615c" } }) })
    .geomRule({
      yintercept: 5.517,
      linewidth: 1,
      alpha: 0.6,
      aes: aes({ color: { value: "#888888" } }),
    })
    .geomLine({ linewidth: 1.4 })
    .geomPoint({ size: 2.5 })
    .theme("tufte")
    .labs({
      title: "Reference rules on a one-dimensional sample",
      subtitle: "Vertical rule where the apparatus changed; horizontal rule at the modern value",
      x: "Determination",
      y: "Density of the earth (water = 1)",
    })
    .spec(),
);
