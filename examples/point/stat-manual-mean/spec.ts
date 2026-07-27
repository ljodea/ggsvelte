import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { groupScatter } from "./data.js";

export default defineExample(
  // Raw scatter plus one centroid per series via stat_manual mean (portable
  // named registry — no JS callbacks). first/last keep a source row; aggregate
  // funs synthesize x and y independently (#814).
  gg(groupScatter, aes({ x: "x", y: "y", color: "series" }))
    .geomPoint({ size: 2.5, alpha: 0.35 })
    .geomPoint({ stat: "manual", fun: "mean", size: 5, alpha: 0.95 })
    .scaleColorManual({
      domain: ["A", "B"],
      values: ["#1b9e77", "#d95f02"],
    })
    .theme("classic")
    .labs({
      title: "stat manual: per-group mean centroids",
      subtitle: 'Faint points are identity; large points are fun="mean" per series',
      x: "x",
      y: "y",
      color: "Series",
    })
    .spec(),
);
