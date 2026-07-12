import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { metrics } from "./data.js";

export default defineExample(
  gg(metrics, aes({ x: "month", y: "value" }))
    .geomLine()
    .geomPoint({ size: 2 })
    .facet({ wrap: "metric", ncol: 3, scales: "free_y" })
    .labs({
      title: "Twelve months, three magnitudes",
      x: "Month",
      y: "Value",
    })
    .spec(),
);
