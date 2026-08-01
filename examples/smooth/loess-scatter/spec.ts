import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { chocolateBars } from "./data.js";

export default defineExample(
  gg(chocolateBars, aes({ x: "cocoaPercent", y: "rating" }))
    .geomSmooth({ method: "loess", span: 0.75 })
    .geomPoint({ alpha: 0.25, size: 2 })
    .theme("tufte")
    .labs({
      title: "Cocoa percent against bar rating",
      subtitle: "Loess through 2,530 chocolate reviews, with a confidence band",
      x: "Cocoa (%)",
      y: "Rating (1–4)",
    })
    .spec(),
);
