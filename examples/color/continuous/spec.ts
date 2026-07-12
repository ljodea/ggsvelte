import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { stations } from "./data.js";

export default defineExample(
  gg(stations, aes({ x: "elevation", y: "julyTemp", color: "elevation" }))
    .geomPoint({ size: 4 })
    .scales({ color: { type: "sequential", scheme: "viridis" } })
    .labs({
      title: "It gets colder as you climb",
      x: "Elevation (m)",
      y: "July mean temperature (°C)",
      color: "Elevation (m)",
    })
    .spec(),
);
