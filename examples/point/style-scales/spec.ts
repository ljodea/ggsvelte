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
import { marchRoute } from "./data.js";

export default defineExample(
  // Five style channels, all driven by the two things Minard had: how many men
  // were left, and which way they were walking. Width from strength is his own
  // encoding; size and fade repeat it on the marks so the collapse reads even
  // where the band is thin.
  gg(marchRoute, aes({ x: "long", y: "lat", color: "direction" }))
    .geomPath({
      aes: { group: "leg", linewidth: "survivors", linetype: "direction" },
      alpha: 0.85,
    })
    .geomPoint({
      aes: { size: "survivors", alpha: "survivors", shape: "direction" },
    })
    .scales({
      ...scaleSizeContinuous({ range: [2, 9] }),
      ...scaleAlphaContinuous({ range: [0.4, 1] }),
      ...scaleLinewidthContinuous({ range: [1, 9] }),
      ...scaleShapeDiscrete({ range: ["circle", "triangle"] }),
      ...scaleLinetypeDiscrete({ range: ["solid", "dashed"] }),
      color: { type: "ordinal", scheme: "tableau10" },
    })
    .labs({
      title: "Minard's march on five style channels",
      subtitle: "Width, size and fade all carry strength; line type and shape carry direction",
      x: "Longitude east",
      y: "Latitude north",
      size: "Men left",
      alpha: "Men left",
      linewidth: "Men left",
      shape: "Direction",
      linetype: "Direction",
      color: "Direction",
    })
    .spec(),
);
