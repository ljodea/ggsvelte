import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { twinClouds } from "./data.js";

export default defineExample(
  // Bivariate KDE isolines over a scatter cloud (ggplot2 geom_density_2d).
  gg(twinClouds, aes({ x: "x", y: "y" }))
    .geomPoint({ alpha: 0.55, size: 2.2 })
    .geomDensity2d({ bins: 5, n: 40, linewidth: 1.2 })
    .theme("classic")
    .labs({
      title: "2D density isolines",
      subtitle: "Product Gaussian KDE contours (ggplot2 geom_density_2d)",
      x: "x",
      y: "y",
    })
    .spec(),
);
