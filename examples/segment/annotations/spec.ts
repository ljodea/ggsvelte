import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { annotations } from "./data.js";

export default defineExample(
  // Finite segments — one line per row from (x,y) to (xend,yend). Unlike rule,
  // endpoints are data-mapped and do not span the panel.
  gg(annotations, aes({ x: "x", y: "y", xend: "xend", yend: "yend", color: "kind" }))
    .geomSegment({ linewidth: 1.75, lineend: "round", alpha: 0.9 })
    .geomPoint({ size: 2.5 })
    .geomPoint({ aes: { x: "xend", y: "yend" }, size: 2 })
    .labs({
      title: "Finite segment annotations",
      subtitle: "Data-driven leaders from start points to end anchors",
      x: "x",
      y: "y",
    })
    .spec(),
);
