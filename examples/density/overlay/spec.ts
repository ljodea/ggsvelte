import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { galtonChildren } from "./data.js";

export default defineExample(
  gg(galtonChildren, aes({ x: "height", fill: "gender" }))
    .geomDensity({ alpha: 0.45 })
    .scaleFillManual({
      domain: ["Daughters", "Sons"],
      values: ["#8b7ec8", "#3aa99f"],
    })
    .theme("minimal")
    .labs({
      title: "Two densities on one axis",
      subtitle: "Heights for sons and daughters; the means separate while the ranges overlap",
      x: "Height (inches)",
      y: "Density",
      fill: "Child",
    })
    .spec(),
);
