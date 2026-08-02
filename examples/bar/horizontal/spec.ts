import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { armadaTonnage } from "./data.js";

export default defineExample(
  gg(armadaTonnage, aes({ x: "squadron", y: "tons" }))
    .geomCol()
    .coordFlip()
    .theme("fivethirtyeight")
    .labs({
      title: "Category totals, flipped so labels read across",
      subtitle: "Ordered smallest to largest so the flip reads bottom-up",
      x: "Squadron",
      y: "Tons",
    })
    .spec(),
);
