import { aes, gg, scaleFillContinuous } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { criminalStature } from "./data.js";

export default defineExample(
  gg(criminalStature, aes({ x: "finger", y: "height", fill: "men" }))
    .geomRaster()
    .scales(scaleFillContinuous({ scheme: "viridis" }))
    .theme("few")
    .labs({
      title: "Three thousand criminals, measured",
      subtitle:
        "Macdonell, 1902: stature against left middle-finger length, 495 cells of a complete grid",
      x: "Left middle finger (cm)",
      y: "Height (feet)",
      fill: "Men",
    })
    .spec(),
);
