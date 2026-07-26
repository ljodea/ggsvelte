import { aes, gg, scaleColorViridisC } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { viridisPoints } from "./data.js";

export default defineExample(
  gg(viridisPoints, aes({ x: "x", y: "y", color: "z" }))
    .geomPoint({ size: 4 })
    .scales(scaleColorViridisC({ option: "plasma" }))
    .theme("minimal")
    .labs({
      title: "scale_color_viridis_c",
      subtitle: "Named viridis-family continuous colour (option: plasma)",
      x: "x",
      y: "y",
      color: "z",
    })
    .spec(),
);
