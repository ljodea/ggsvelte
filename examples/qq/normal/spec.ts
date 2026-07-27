import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { heights } from "./data.js";

export default defineExample(
  gg(heights, aes({ sample: "height" }))
    .geomQq({ size: 2.5, alpha: 0.85 })
    .geomQqLine({ linewidth: 1.2, alpha: 0.7 })
    .theme("classic")
    .labs({
      title: "geom_qq + geom_qq_line",
      subtitle: "Sample quantiles vs theoretical normal; line through quartile match",
      x: "Theoretical",
      y: "Sample",
    })
    .spec(),
);
