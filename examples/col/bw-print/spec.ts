import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { printCounts } from "./data.js";

export default defineExample(
  gg(printCounts, aes({ x: "category", y: "n" }))
    .geomCol()
    .theme("bw")
    .labs({
      title: "theme_bw — print-friendly chrome",
      subtitle: "White panel, grey grid, rectangular border",
      x: "Category",
      y: "Count",
    })
    .spec(),
);
