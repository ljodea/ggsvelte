import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { penguins } from "./data.js";

export default defineExample(
  // stat_ellipse fits a bivariate normal per group and draws the 95% contour
  // as a closed path. The ring is a claim about the population, not a hull
  // around the points: a few birds are meant to fall outside it.
  gg(penguins, aes({ x: "bill", y: "flipper", color: "species" }))
    .geomPoint({ alpha: 0.6, size: 2.4 })
    .geomPath({ stat: "ellipse", level: 0.95, segments: 51, linewidth: 1.5 })
    .scales({ color: { type: "ordinal", scheme: "tableau10" } })
    .theme("classic")
    .labs({
      title: "Three penguins, three ellipses",
      subtitle: "95% bivariate normal rings around each species at Palmer Station",
      x: "Bill length (mm)",
      y: "Flipper length (mm)",
      color: "Species",
    })
    .spec(),
);
