import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { michelsonRuns } from "../by-category/data.js";

export default defineExample(
  // Mirrored y-density polygons per experimental run (ggplot2 geom_violin).
  gg(michelsonRuns, aes({ x: "run", y: "velocity", fill: "run" }))
    .geomViolin({ scale: "width", trim: true, alpha: 0.75, linewidth: 0.6 })
    .scaleFillManual({
      domain: ["Jun 5", "Jun 7", "Jun 9", "Jun 12", "Jul 2"],
      values: ["#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b"],
    })
    .scales({ x: { domain: ["Jun 5", "Jun 7", "Jun 9", "Jun 12", "Jul 2"] } })
    .theme("few")
    .labs({
      title: "Violin plots for the same five runs",
      subtitle: "Mirrored density of velocity so the shape of each run is visible",
      x: "Run",
      y: "Velocity (km/s − 299,000)",
      fill: "",
    })
    .spec(),
);
