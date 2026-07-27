import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { ablineScatter } from "./data.js";

export default defineExample(
  gg(ablineScatter, aes({ x: "x", y: "y" }))
    .geomPoint({ size: 3.5 })
    .geomAbline({ slope: 1, intercept: 0, linewidth: 1.2 })
    .theme("minimal")
    .labs({
      title: "geom_abline",
      subtitle: "Identity reference y = x clipped to the panel",
      x: "x",
      y: "y",
    })
    .spec(),
);
