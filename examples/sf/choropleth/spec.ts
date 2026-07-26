import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { districts } from "./data.js";

export default defineExample(
  // Portable geom_sf choropleth (#809): GeoJSON Geometry JSON strings in a
  // data column, fill by rate, labels at representative points, fixed-aspect
  // coord_sf (already-projected units; no CRS reproject).
  gg(districts, aes({ fill: "rate", label: "district", color: "district" }))
    .geomSf({ linewidth: 1.1, alpha: 0.92 })
    .geomSfText({ size: 12, alpha: 0.95 })
    .coordSf()
    .theme("classic")
    .labs({
      title: "District rates (portable SF)",
      subtitle: "geom_sf + geom_sf_text + coord_sf — GeoJSON strings, already projected",
      fill: "Rate",
      color: "",
    })
    .spec(),
);
