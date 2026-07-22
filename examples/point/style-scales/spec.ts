import {
  aes,
  gg,
  scaleAlphaContinuous,
  scaleLinetypeDiscrete,
  scaleLinewidthContinuous,
  scaleShapeDiscrete,
  scaleSizeContinuous,
} from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { data } from "./data.js";

export default defineExample(
  gg(data, aes({ x: "x", y: "y" }))
    .geomLine({
      aes: { group: "group", linewidth: "weight", linetype: "group" },
      alpha: 0.7,
    })
    .geomPoint({
      aes: { size: "magnitude", alpha: "confidence", shape: "group" },
    })
    .scales({
      ...scaleSizeContinuous({ range: [3, 10] }),
      ...scaleAlphaContinuous({ range: [0.35, 1] }),
      ...scaleLinewidthContinuous({ range: [1, 5] }),
      ...scaleShapeDiscrete({ range: ["circle", "triangle"] }),
      ...scaleLinetypeDiscrete({ range: ["solid", "dashed"] }),
    })
    .labs({
      title: "Complete mapped style scales",
      subtitle: "Five data-driven style channels",
      x: "Observation",
      y: "Value",
      size: "Magnitude",
      alpha: "Confidence",
      linewidth: "Weight",
      shape: "Region",
      linetype: "Region",
    })
    .spec(),
);
