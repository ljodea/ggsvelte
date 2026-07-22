import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { bands } from "./data.js";

export default defineExample(
  gg(bands, aes({ xmin: "xmin", xmax: "xmax", ymin: "ymin", ymax: "ymax", fill: "period" }))
    .geomRect({ alpha: 0.75 })
    .labs({
      title: "Shaded regions (geom rect)",
      x: "Time",
      y: "Value",
    })
    .spec(),
);
