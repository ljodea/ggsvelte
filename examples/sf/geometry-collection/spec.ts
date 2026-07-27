import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { collectionRegions } from "./data.js";

export default defineExample(
  // GeometryCollection expands to leaf polygons (two closed path parts).
  gg(collectionRegions, aes({ fill: "rate" }))
    .geomSf({ alpha: 0.9, linewidth: 0.8 })
    .theme("classic")
    .labs({
      title: "GeometryCollection expand",
      subtitle: "One GC cell → two polygon parts (#809 phase 6)",
      fill: "rate",
    })
    .spec(),
);
