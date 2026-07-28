import { aes, gg, scaleFillContinuous } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { oldFaithful } from "./data.js";

export default defineExample(
  gg(oldFaithful, aes({ x: "duration", y: "waiting" }))
    .geomBin2d({ bins: 16 })
    .scales(scaleFillContinuous({ scheme: "viridis" }))
    .theme("minimal")
    .labs({
      title: "Old Faithful erupts two ways",
      subtitle: "272 eruptions counted into a grid of cells: short then soon, or long then late",
      x: "Eruption length (minutes)",
      y: "Wait for the next eruption (minutes)",
      fill: "Eruptions",
    })
    .spec(),
);
