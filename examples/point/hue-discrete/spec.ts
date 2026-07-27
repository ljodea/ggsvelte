import { aes, gg, scaleColorHue } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { hueGroups } from "./data.js";

export default defineExample(
  gg(hueGroups, aes({ x: "x", y: "y", color: "group" }))
    .geomPoint({ size: 4 })
    .scales(scaleColorHue())
    .theme("minimal")
    .labs({
      title: "scale_color_hue",
      subtitle: "Even-hue discrete colour (ggplot2-shaped default discrete path)",
      color: "group",
    })
    .spec(),
);
