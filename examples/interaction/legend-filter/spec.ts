import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { ridership } from "./data.js";

export default defineExample(
  gg(ridership, aes({ x: "month", y: "riders", color: "mode" }))
    .geomLine({ linewidth: 2.2 })
    .geomPoint({ size: 3.2 })
    .labs({
      title: "Filter the data without losing color identity",
      x: "Month",
      y: "Daily riders (thousands)",
      color: "Mode",
    })
    .spec(),
);
