import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { fortifiedMap, regionRates } from "./data.js";

export default defineExample(
  // Fortified map join (ggplot2 geom_map): value rows keyed by region fill
  // closed map polygons from long/lat coordinates.
  gg(regionRates, aes({ map_id: "region", fill: "rate" }))
    .geomMap({ map: { values: fortifiedMap }, linewidth: 1.2, alpha: 0.95 })
    .theme("classic")
    .labs({
      title: "Regional rates (toy map)",
      subtitle: "Fortified long/lat polygons joined on region (geom_map)",
      fill: "Rate",
    })
    .spec(),
);
