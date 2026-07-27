import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { langren1644 } from "./data.js";

export default defineExample(
  gg(langren1644, aes({ x: "longitude", y: "rank" }))
    .geomPoint({ size: 3.5, aes: aes({ color: "source" }) })
    .geomLabel({
      aes: aes({ label: "name", fill: "source" }),
      anchor: "start",
      dx: 7,
      size: 10,
      padding: 3,
      radius: 3,
    })
    .scaleColorManual({ domain: ["Astronomy", "Map"], values: ["#205ea6", "#a02f6f"] })
    .scaleFillManual({ domain: ["Astronomy", "Map"], values: ["#e8f0fb", "#f8e8f0"] })
    .theme("classic")
    .labs({
      title: "geom_label — text with a readable background box",
      subtitle: "Van Langren estimates with filled label boxes",
      x: "Estimated Toledo–Rome longitude (°)",
      y: "Ordered by estimate",
      color: "Derived from",
      fill: "",
    })
    .spec(),
);
