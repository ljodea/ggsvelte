import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { choleraDeaths, waterPumps } from "./data.js";

export default defineExample(
  gg(choleraDeaths, aes({ x: "x", y: "y" }))
    .geomPoint({ alpha: 0.45, size: 1.8 })
    .geomDensity2d({
      bins: 6,
      n: 48,
      linewidth: 1,
      aes: aes({ color: { value: "#1d4ed8" } }),
    })
    // The pumps are the argument: without them the rings are a crowd of dots,
    // and with them the innermost ring lands on Broad Street.
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
      title: "Snow's cholera deaths close on one pump",
      subtitle: "578 deaths in Soho, September 1854; red crosses are the 13 public pumps",
      x: "Map east",
      y: "Map north",
    })
    .spec(),
);
