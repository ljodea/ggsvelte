import { aes, gg, scaleFillContinuous } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { cloud } from "./data.js";

export default defineExample(
  gg(cloud, aes({ x: "x", y: "y" }))
    .geomHex({ bins: 18 })
    .scales(scaleFillContinuous({ scheme: "viridis" }))
    .theme("minimal")
    .labs({
      title: "geom_hex — hexagonal 2D bins",
      subtitle: "500 points; fill = after_stat count",
      x: "x",
      y: "y",
      fill: "count",
    })
    .spec(),
);
