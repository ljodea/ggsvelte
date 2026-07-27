import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { twinClouds } from "./data.js";

export default defineExample(
  // Closed KDE isoline rings filled by density level (geom_density_2d_filled).
  gg(twinClouds, aes({ x: "x", y: "y" }))
    .geomPoint({ alpha: 0.45, size: 2.0 })
    .geomDensity2dFilled({ bins: 5, n: 40, alpha: 0.55 })
    .theme("classic")
    .labs({
      title: "2D density filled bands",
      subtitle: "Closed KDE rings; fill defaults to after_stat(level)",
      x: "x",
      y: "y",
    })
    .spec(),
);
