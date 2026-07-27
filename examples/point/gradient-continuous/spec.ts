import { aes, gg, scaleColorGradient } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { gradientPoints } from "./data.js";

export default defineExample(
  gg(gradientPoints, aes({ x: "x", y: "y", color: "z" }))
    .geomPoint({ size: 4 })
    .scales(scaleColorGradient({ low: "#132B43", high: "#56B1F7" }))
    .theme("minimal")
    .labs({
      title: "scale_color_gradient",
      subtitle: "Two-stop continuous colour (low → high)",
      x: "x",
      y: "y",
      color: "z",
    })
    .spec(),
);
