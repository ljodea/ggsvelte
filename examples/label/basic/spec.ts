import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { langren1644 } from "./data.js";

export default defineExample(
  gg(langren1644, aes({ x: "longitude", y: "rank" }))
    // Thumbnail contract: boxes must read at 96px index size. Soft fill + dark
    // stroke (not pure white) so GeomLabel is visually distinct from GeomText
    // on the same layout.
    .geomPoint({ size: 2.2, alpha: 0.4, aes: aes({ color: { value: "#4a5568" } }) })
    .geomLabel({
      aes: aes({
        label: "name",
        fill: { value: "#dbe4f0" },
        color: { value: "#0f172a" },
      }),
      anchor: "start",
      dx: 7,
      size: 12,
      padding: 5,
      radius: 5,
      linewidth: 1.8,
    })
    .theme("minimal")
    .labs({
      title: "Text with rounded background boxes",
      subtitle: "Same labels as GeomText, with a measured box behind each name",
      x: "Estimated Toledo–Rome longitude (°)",
      y: "Ordered by estimate",
    })
    .spec(),
);
