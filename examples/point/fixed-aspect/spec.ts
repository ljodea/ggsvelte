import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { unitCircle } from "./data.js";

export default defineExample(
  gg(unitCircle, aes({ x: "x", y: "y" }))
    .geomPoint({ size: 3 })
    .coordFixed()
    .labs({
      title: "Equal units stay circular",
      subtitle: "coord_fixed preserves one CSS pixel per x and y data unit",
      x: "x",
      y: "y",
    })
    .spec(),
);
