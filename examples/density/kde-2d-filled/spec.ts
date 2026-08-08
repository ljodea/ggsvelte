import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { choleraDeaths, waterPumps } from "./data.js";

export default defineExample(
  gg(choleraDeaths, aes({ x: "x", y: "y" }))
    .geomDensity2dFilled({ bins: 6, n: 48, alpha: 0.8 })
    .geomPoint({
      alpha: 0.55,
      size: 1.6,
      aes: aes({ color: { value: "Deaths", scale: true } }),
    })
    .geomPoint({
      data: waterPumps,
      aes: aes({ x: "x", y: "y", color: { value: "Pumps", scale: true } }),
      size: 4,
      shape: "cross",
    })
    .scaleColorManual({
      domain: ["Deaths", "Pumps"],
      values: ["#1e293b", "#b91c1c"],
    })
    .coordFixed()
    .theme("map")
    .labs({
      title: "Filled density bands over points",
      subtitle: "Darker rings mark denser streets; the peak sits on Broad Street",
      // theme_map blanks tick labels; empty x/y suppress the field-name fallbacks.
      x: "",
      y: "",
      fill: "Density",
      color: "",
    })
    .spec(),
);
