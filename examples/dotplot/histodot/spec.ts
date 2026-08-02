import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { earthDensity } from "./data.js";

export default defineExample(
  gg(earthDensity, aes({ x: "density" }))
    .geomDotplot({ binwidth: 0.05, boundary: 0, stackdir: "up" })
    .scales({ y: { breaks: [0, 1, 2, 3, 4, 5] } })
    .theme("classic")
    .labs({
      title: "One dot per measurement, stacked in bins",
      subtitle: "Twenty-nine runs of a torsion balance; the modern density sits at 5.517",
      x: "Density of the earth, water = 1",
      y: "Runs",
    })
    .spec(),
);
