import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { galtonHeights } from "./data.js";

export default defineExample(
  // summary_bin collapses each non-empty bin of x to mean ± se; the errorbar
  // and the line share one bin grid, so they mark the same eleven means.
  gg(galtonHeights, aes({ x: "parent", y: "child" }))
    .geomPoint({ alpha: 0.15, size: 2.4 })
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
      title: "Galton's children regress towards the middle",
      subtitle:
        "Mean child height ± one standard error in each one-inch class of mid-parent height",
      x: "Mid-parent height (inches)",
      y: "Child height (inches)",
    })
    .spec(),
);
