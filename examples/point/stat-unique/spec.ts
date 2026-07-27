import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { overplottedGrid } from "./data.js";

export default defineExample(
  // Three rows share each (x, y, series) aesthetic key. stat unique keeps the
  // first occurrence only — same geom, fewer marks (ggplot2 stat_unique).
  gg(overplottedGrid, aes({ x: "x", y: "y", color: "series" }))
    .geomPoint({ stat: "unique", size: 3.5, alpha: 0.9 })
    .scaleColorManual({
      domain: ["A", "B"],
      values: ["#1b9e77", "#d95f02"],
    })
    .theme("classic")
    .labs({
      title: "stat unique: first-wins aesthetic dedupe",
      subtitle: "Each (x, y, series) triple is repeated thrice; unique draws it once",
      x: "x",
      y: "y",
      color: "Series",
    })
    .spec(),
);
