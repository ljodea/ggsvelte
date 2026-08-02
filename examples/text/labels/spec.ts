import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { langren1644 } from "./data.js";

export default defineExample(
  gg(langren1644, aes({ x: "longitude", y: "rank" }))
    // Thumbnail contract: bare text is the mark. No color legend, no boxes —
    // names sit next to faint anchors so GeomText reads as ink-only labels.
    .geomPoint({ size: 2.2, alpha: 0.4, aes: aes({ color: { value: "#4a5568" } }) })
    .geomText({
      aes: aes({ label: "name", color: { value: "#1a202c" } }),
      anchor: "start",
      dx: 7,
      size: 12,
    })
    .theme("minimal")
    .labs({
      title: "Bare text labels on points",
      subtitle: "Each estimate is a name; labels draw exactly where they are placed",
      x: "Estimated Toledo–Rome longitude (°)",
      y: "Ordered by estimate",
    })
    .spec(),
);
