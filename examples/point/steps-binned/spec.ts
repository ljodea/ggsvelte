import { aes, gg, scaleColorSteps } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { stepsPoints } from "./data.js";

export default defineExample(
  gg(stepsPoints, aes({ x: "x", y: "y", color: "z" }))
    .geomPoint({ size: 4 })
    .scales(scaleColorSteps({ low: "#132B43", high: "#56B1F7" }))
    .theme("minimal")
    .labs({
      title: "scale_color_steps",
      subtitle: "Binned continuous colour with hard steps (low → high)",
      x: "x",
      y: "y",
      color: "z",
    })
    .spec(),
);
