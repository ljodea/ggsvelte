import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { figureEight } from "./data.js";

export default defineExample(
  // geom_path connects in data (row) order within each group — no x-sort.
  // This figure-eight revisits x; sorting by x would scramble the loops.
  gg(figureEight, aes({ x: "x", y: "y" }))
    .geomPath({ linewidth: 2, alpha: 0.95 })
    .geomPoint({ size: 2.2, alpha: 0.55 })
    .coordFixed()
    .theme("classic")
    .labs({
      title: "Figure-eight path in data order",
      subtitle: "geom_path keeps row order; geom_line would sort by x",
      x: "x",
      y: "y",
    })
    .spec(),
);
