import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { choleraDeaths, waterPumps } from "./data.js";

export default defineExample(
  gg(choleraDeaths, aes({ x: "x", y: "y" }))
    .geomDensity2dFilled({ bins: 6, n: 48, alpha: 0.8 })
    .geomPoint({
      alpha: 0.6,
      size: 1.4,
      aes: aes({ color: { value: "#f8fafc" } }),
    })
    .geomPoint({
      data: waterPumps,
      aes: aes({ x: "x", y: "y", color: { value: "#b91c1c" } }),
      size: 4,
      shape: "cross",
    })
    .scales({
      x: { breaks: [8, 10, 12, 14, 16, 18] },
      y: { breaks: [6, 8, 10, 12, 14, 16, 18] },
    })
    .coordFixed()
    .theme("classic")
    .labs({
      title: "The same deaths as filled bands",
      subtitle: "Closed density rings shaded by level; red crosses are the Soho pumps",
      x: "Map east",
      y: "Map north",
      fill: "Deaths per unit area",
    })
    .spec(),
);
