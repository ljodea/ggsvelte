import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { longitudeEstimates } from "./data.js";

export default defineExample(
  // Data-driven form: aes.x is mapped, so every row draws one vertical rule
  // spanning the panel. Van Langren's own graph was exactly this - a
  // one-dimensional strip of the estimates - which makes the rug not a
  // restyling of his chart but a reconstruction of it.
  gg(longitudeEstimates, aes({ x: "longitude" }))
    .geomRule({ alpha: 0.35, linewidth: 1.5 })
    .theme("minimal")
    .labs({
      title: "The first statistical graph was a rug",
      subtitle:
        "Van Langren, 1628–1644: 61 estimates of a single fixed distance, spread across thirteen degrees",
      x: "Estimated distance (degrees of longitude)",
    })
    .spec(),
);
