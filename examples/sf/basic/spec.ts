import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { triangles } from "./data.js";

export default defineExample(
  // geom_sf: GeoJSON Geometry JSON strings in a column (already projected).
  gg(triangles, aes({ fill: "rate" }))
    .geomSf({ alpha: 0.9, linewidth: 0.8 })
    .theme("classic")
    .labs({
      title: "geom_sf polygons",
      subtitle: "Portable GeoJSON Geometry strings (already projected; #809)",
      fill: "rate",
    })
    .spec(),
);
