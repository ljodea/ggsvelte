import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { temperatures } from "./data.js";

export default defineExample(
  gg(temperatures, aes({ x: "month", y: "temp", color: "city" }))
    .geomLine({ linewidth: 2 })
    .geomPoint({ size: 2.5 })
    .scales({ x: { breaks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] } })
    .labs({
      title: "Monthly mean temperature",
      x: "Month",
      y: "Temperature (°C)",
      color: "City",
    })
    .spec(),
);
