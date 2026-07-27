import { aes, gg, scaleFillContinuous } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { cloud } from "./data.js";

export default defineExample(
  gg(cloud, aes({ x: "x", y: "y" }))
    .geomBin2d({ bins: 24 })
    .scales(scaleFillContinuous({ scheme: "viridis" }))
    .theme("minimal")
    .labs({
      title: "geom_bin2d — rectangular 2D bins",
      subtitle: "400 points in two overlapping clouds; fill = after_stat count",
      x: "x",
      y: "y",
      fill: "count",
    })
    .spec(),
);
