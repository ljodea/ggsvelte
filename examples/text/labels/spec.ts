import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { langren1644 } from "./data.js";

export default defineExample(
  gg(langren1644, aes({ x: "longitude", y: "rank" }))
    .geomPoint({ size: 3.5, aes: aes({ color: "source" }) })
    // Labels draw exactly where they are placed - there is no collision
    // detection - so the twelve names are staggered down the panel by rank and
    // start-anchored to the right of their dot, the same trick van Langren used
    // on a one-dimensional chart.
    .geomText({ aes: aes({ label: "name" }), anchor: "start", dx: 7, size: 10 })
    .scaleColorManual({ domain: ["Astronomy", "Map"], values: ["#205ea6", "#a02f6f"] })
    .theme("tufte")
    .labs({
      title: "Text as the data mark",
      subtitle: "Each estimate is a name; the chart is a labelled strip of who made it",
      x: "Estimated Toledo–Rome longitude (°)",
      y: "Ordered by estimate",
      color: "Derived from",
    })
    .spec(),
);
