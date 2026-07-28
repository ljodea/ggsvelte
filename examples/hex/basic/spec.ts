import { aes, gg, scaleFillContinuous } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { fijiQuakes } from "./data.js";

export default defineExample(
  gg(fijiQuakes, aes({ x: "long", y: "lat" }))
    .geomHex({ bins: 18 })
    .scales(scaleFillContinuous({ scheme: "viridis" }))
    .theme("minimal")
    .labs({
      title: "A thousand earthquakes off Fiji",
      subtitle: "Every event above magnitude 4 since 1964, counted into hexagons",
      x: "Longitude (°E)",
      y: "Latitude (°)",
      fill: "Events",
    })
    .spec(),
);
