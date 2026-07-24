import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { halleyLifeTable } from "./data.js";

export default defineExample(
  gg(halleyLifeTable, aes({ x: "age", y: "survivors" }))
    .geomArea({ alpha: 0.7 })
    .geomLine({ linewidth: 1.5 })
    .scales({
      x: { breaks: [1, 10, 20, 30, 40, 50, 60, 70, 80], nice: false },
      y: { breaks: [0, 200, 400, 600, 800, 1000] },
    })
    .theme("classic")
    .labs({
      title: "Halley's life table, 1693",
      subtitle: "Survivors from a cohort of 1,000 born in Breslau",
      x: "Age",
      y: "Surviving",
    })
    .spec(),
);
