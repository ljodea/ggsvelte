import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { peakGrid } from "./data.js";

export default defineExample(
  // Isolines of a radial Gaussian peak on a regular x×y×z grid (ggplot2 geom_contour).
  gg(peakGrid, aes({ x: "x", y: "y", z: "z" }))
    .geomContour({ bins: 8, linewidth: 1.2 })
    .theme("classic")
    .labs({
      title: "Contour isolines",
      subtitle: "Marching-squares levels of a radial peak (ggplot2 geom_contour)",
      x: "x",
      y: "y",
    })
    .spec(),
);
