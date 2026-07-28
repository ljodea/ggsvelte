import { aes, gg, scaleFillContinuous } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { heightRings } from "./data.js";

export default defineExample(
  // geom_sf reads a GeoJSON Geometry per row from the geometry column, already
  // projected into the panel's units - three rows here, one per height ring.
  gg(heightRings, aes({ fill: "height" }))
    .geomSf({ alpha: 0.55, linewidth: 0.9 })
    .scales(scaleFillContinuous({ scheme: "viridis" }))
    .coordFixed()
    .theme("classic")
    .labs({
      title: "Maunga Whau as three simple features",
      subtitle: "The ground above 130, 140 and 150 metres, one GeoJSON polygon per row",
      fill: "Metres",
    })
    .spec(),
);
