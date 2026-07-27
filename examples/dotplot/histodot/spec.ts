import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { samples } from "./data.js";

export default defineExample(
  // Histodot: one point per observation stacked in fixed bins (ggplot2 geom_dotplot).
  gg(samples, aes({ x: "value" }))
    .geomDotplot({ binwidth: 0.5, boundary: 0, stackdir: "up" })
    .theme("classic")
    .labs({
      title: "Dotplot histodot",
      subtitle: "One point per observation, stacked in fixed bins (ggplot2 geom_dotplot)",
      x: "value",
      y: "stack",
    })
    .spec(),
);
