import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { rangeEndpoints } from "./data.js";

export default defineExample(
  // Blank-only layer: axes and panel chrome from mapped aesthetics, no marks.
  gg(rangeEndpoints, aes({ x: "x", y: "y" }))
    .geomBlank()
    .theme("classic")
    .labs({
      title: "Axes trained with no marks",
      subtitle: "geom_blank alone — useful when co-layering later or pinning domains",
      x: "x",
      y: "y",
    })
    .spec(),
);
