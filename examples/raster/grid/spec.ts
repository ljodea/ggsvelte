import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { grid } from "./data.js";

export default defineExample(
  gg(grid, aes({ x: "x", y: "y", fill: "z" }))
    .geomRaster()
    .labs({
      title: "Regular density surface (geom raster)",
      x: "x",
      y: "y",
    })
    .spec(),
);
