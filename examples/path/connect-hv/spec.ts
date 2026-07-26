import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { stepCorners } from "./data.js";

export default defineExample(
  // stat connect expands successive points into real path vertices (hv elbows).
  // Geom curve step is stroke-only; connect materializes corners in the batch.
  gg(stepCorners, aes({ x: "x", y: "y" }))
    .geomPath({ stat: "connect", connection: "hv", linewidth: 2.5, alpha: 0.95 })
    .geomPoint({ size: 3.5, alpha: 0.85 })
    .theme("classic")
    .labs({
      title: "stat connect: hv path joins",
      subtitle: "Three data points expand to horizontal-then-vertical elbows",
      x: "x",
      y: "y",
    })
    .spec(),
);
