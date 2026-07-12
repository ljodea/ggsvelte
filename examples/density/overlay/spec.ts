import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { sessions } from "./data.js";

export default defineExample(
  gg(sessions, aes({ x: "minutes", fill: "cohort" }))
    .geomDensity({ alpha: 0.45 })
    .labs({
      title: "Session length by cohort",
      x: "Session length (minutes)",
      y: "Density",
      fill: "Cohort",
    })
    .spec(),
);
