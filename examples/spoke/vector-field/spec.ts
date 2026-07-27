import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { vectorField } from "./data.js";

export default defineExample(
  // geom_spoke: one segment per row from (x,y) in direction angle (radians)
  // with length radius. Tips train domains; paint reuses segment strokes.
  gg(vectorField, aes({ x: "x", y: "y", angle: "angle", radius: "radius" }))
    .geomSpoke({ linewidth: 1.6, lineend: "round", alpha: 0.9 })
    .geomPoint({ size: 2, alpha: 0.55 })
    .theme("classic")
    .labs({
      title: "Spoke vector field",
      subtitle: "geom_spoke: origin + angle (radians) + radius → segment",
      x: "x",
      y: "y",
    })
    .spec(),
);
