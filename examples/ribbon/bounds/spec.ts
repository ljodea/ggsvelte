import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { series } from "./data.js";

export default defineExample(
  gg(series, aes({ x: "x", ymin: "lo", ymax: "hi" }))
    .geomRibbon({ alpha: 0.35 })
    .geomLine({ aes: { x: "x", y: "mid" } })
    .labs({
      title: "Precomputed interval ribbon",
      x: "x",
      y: "value",
    })
    .spec(),
);
