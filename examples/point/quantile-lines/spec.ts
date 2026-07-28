import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { fijiQuakes } from "./data.js";

export default defineExample(
  // Linear RQ fits at the default 0.25 / 0.5 / 0.75 quantiles of y given x.
  // A mean would say one thing about magnitude at depth; the quartiles say
  // how the whole spread narrows, which is the interesting part.
  gg(fijiQuakes, aes({ x: "depth", y: "mag" }))
    .geomPoint({ alpha: 0.3, size: 2 })
    .geomQuantile({ linewidth: 1.4 })
    .theme("classic")
    .labs({
      title: "How strong an earthquake gets, by how deep it is",
      subtitle: "Lower quartile, median and upper quartile of magnitude through the crust off Fiji",
      x: "Depth (km)",
      y: "Richter magnitude",
    })
    .spec(),
);
