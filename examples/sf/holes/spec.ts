import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { donuts } from "./data.js";

export default defineExample(
  // Interior rings are even-odd holes (SVG fill-rule, canvas, hit-test).
  gg(donuts, aes({ fill: "rate" }))
    .geomSf({ alpha: 0.9, linewidth: 0.9 })
    .theme("classic")
    .labs({
      title: "geom_sf polygon holes",
      subtitle: "Even-odd interior rings punch holes (#809 phase 4)",
      fill: "rate",
    })
    .spec(),
);
