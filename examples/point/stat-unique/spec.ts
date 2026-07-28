import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { deadlyQuarrels } from "./data.js";

export default defineExample(
  // stat unique keeps the first row per aesthetic combination. Richardson
  // coded one row per pair of belligerents, so a big war arrives as dozens of
  // rows with the same year and the same death toll: 779 rows, 321 marks.
  gg(deadlyQuarrels, aes({ x: "year", y: "magnitude" }))
    .geomPoint({ stat: "unique", size: 3, alpha: 0.8 })
    .theme("classic")
    .labs({
      title: "779 rows of war, 321 marks",
      subtitle:
        "Richardson counted belligerent pairs, so one war repeats: 44 rows share (1914, 7.2)",
      x: "Year the quarrel began",
      y: "Magnitude (log10 killed)",
    })
    .spec(),
);
