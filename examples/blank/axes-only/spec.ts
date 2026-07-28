import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { halleyFrame } from "./data.js";

export default defineExample(
  // A blank-only layer: the scales, the axes and the panel chrome come from
  // the mapped aesthetics, and not one mark is drawn.
  gg(halleyFrame, aes({ x: "age", y: "survivors" }))
    .geomBlank()
    .scales({
      x: { breaks: [1, 10, 20, 30, 40, 50, 60, 70, 80], nice: false },
      y: { breaks: [0, 200, 400, 600, 800, 1000] },
    })
    .theme("classic")
    .labs({
      title: "The frame before the chart",
      subtitle: "Two corner rows pin the axes of Halley's life table; nothing is drawn on them",
      x: "Age",
      y: "Surviving",
    })
    .spec(),
);
