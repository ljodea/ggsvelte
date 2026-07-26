import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { lissajousEight } from "./data.js";

export default defineExample(
  // geom_path connects in data (row) order within each group — no x-sort.
  // A Lissajous eight has non-monotonic x; sorting by x would scramble it.
  gg(lissajousEight, aes({ x: "x", y: "y" }))
    .geomPath({ linewidth: 2, alpha: 0.95 })
    .geomPoint({ size: 1.8, alpha: 0.55 })
    .coordFixed()
    .theme("classic")
    .labs({
      title: "Lissajous eight in data order",
      subtitle: "geom_path keeps parametric order; geom_line would sort by x",
      x: "x = sin(t)",
      y: "y = sin(2t)",
    })
    .spec(),
);
