import { aes, gg, scaleSizeContinuous } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { gammaVirginis } from "./data.js";

export default defineExample(
  gg(gammaVirginis, aes({ x: "year", y: "angle" }))
    .geomSmooth({ method: "loess", span: 0.75 })
    .geomPoint({ aes: aes({ size: "weight" }), alpha: 0.85 })
    // Herschel's weights run from 0.1 to 8; without a floor the "very
    // uncertain" 1720 observation renders as a speck and reads like a bug.
    .scales(scaleSizeContinuous({ range: [3, 8] }))
    .scales({ x: { labels: "d" } })
    .theme("tufte")
    .labs({
      title: "The first scatterplot, redrawn",
      subtitle: "Herschel plotted γ Virginis in 1833 and fitted the curve by hand",
      x: "Year",
      y: "Position angle (°)",
      size: "Herschel's weight",
    })
    .spec(),
);
