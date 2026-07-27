import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { regions } from "./data.js";

export default defineExample(
  // Closed filled polygons in data order per group — foundation for
  // choropleths / annotation regions (ggplot2 geom_polygon).
  gg(regions, aes({ x: "x", y: "y", group: "region", fill: "region" }))
    .geomPolygon({ alpha: 0.85, linewidth: 1.5 })
    .scaleFillManual({
      domain: ["West", "East"],
      values: ["#4c78a8", "#f58518"],
    })
    .theme("classic")
    .labs({
      title: "Two regions as polygons",
      subtitle: "Vertices connect in data order; the path closes implicitly",
      x: "x",
      y: "y",
      fill: "",
    })
    .spec(),
);
