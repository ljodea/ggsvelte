import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { binnedScatter } from "./data.js";

export default defineExample(
  // Continuous x: summary_bin collapses each non-empty bin to mean ± se.
  // Raw points stay identity; line + errorbar share the same bin grid.
  gg(binnedScatter, aes({ x: "x", y: "y" }))
    .geomPoint({ alpha: 0.4, size: 2.4 })
    .geomErrorbar({
      stat: "summary_bin",
      binwidth: 1,
      boundary: 0,
      width: 0.35,
      linewidth: 1.4,
    })
    .geomLine({
      stat: "summary_bin",
      binwidth: 1,
      boundary: 0,
      linewidth: 1.6,
    })
    .theme("classic")
    .labs({
      title: "stat summary_bin: mean ± se by x bin",
      subtitle: "Continuous x binned at width 1; empty bins omitted",
      x: "x",
      y: "y",
    })
    .spec(),
);
