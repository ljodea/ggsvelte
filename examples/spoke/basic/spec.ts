import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { wind } from "./data.js";

export default defineExample(
  // geom_spoke: origin + angle (radians) + radius in data units → segment.
  gg(wind, aes({ x: "x", y: "y", angle: "theta", radius: "r", color: "station" }))
    .geomSpoke({ linewidth: 1.4 })
    .geomPoint({ size: 2.5 })
    .theme("classic")
    .labs({
      title: "geom_spoke directions",
      subtitle: "Segments from (x, y) by angle (radians) and radius (#810)",
      color: "station",
    })
    .spec(),
);
