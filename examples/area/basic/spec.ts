import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { rainfall } from "./data.js";

export default defineExample(
  gg(rainfall, aes({ x: "month", y: "mm" }))
    .geomArea({ alpha: 0.7 })
    .geomLine({ linewidth: 1.5 })
    .scales({ x: { breaks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], nice: false } })
    .labs({
      title: "Monthly rainfall",
      x: "Month",
      y: "Rainfall (mm)",
    })
    .spec(),
);
