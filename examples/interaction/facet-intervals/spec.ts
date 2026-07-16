import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { observations } from "./data.js";

export default defineExample(
  gg(observations, aes({ x: "x", y: "y" }))
    .geomPoint({ size: 3.8 })
    .facet({ wrap: "region", ncol: 3 })
    .labs({
      title: "Coordinate interval selection across facets",
      x: "Input",
      y: "Response",
    })
    .spec(),
);
