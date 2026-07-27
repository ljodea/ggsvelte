import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { twinClouds } from "./data.js";

export default defineExample(
  // Bivariate normal confidence ellipses per group (ggplot2 stat_ellipse).
  gg(twinClouds, aes({ x: "x", y: "y", color: "g" }))
    .geomPoint({ alpha: 0.65, size: 2.5 })
    .geomPath({ stat: "ellipse", level: 0.95, segments: 51, linewidth: 1.3 })
    .theme("classic")
    .labs({
      title: "Ellipse confidence rings",
      subtitle: "Bivariate normal 95% ellipses per group (ggplot2 stat_ellipse)",
      x: "x",
      y: "y",
    })
    .spec(),
);
