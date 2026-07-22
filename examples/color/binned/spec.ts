import { aes, gg, guideColorsteps, scaleColorBinned } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { readings } from "./data.js";

export default defineExample(
  gg(readings, aes({ x: "hour", y: "pm25", color: "pm25" }))
    .geomPoint({ size: 5 })
    .scales(
      scaleColorBinned({
        breaks: [0, 12, 35, 55, 100],
        range: ["#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"],
      }),
    )
    .guides({
      color: guideColorsteps({ position: "bottom", direction: "horizontal" }),
    })
    .labs({
      title: "Particle pollution by hour",
      x: "Hour",
      y: "PM2.5 (µg/m³)",
      color: "PM2.5 band",
    })
    .spec(),
);
