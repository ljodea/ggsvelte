import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { armadaTonnage } from "./data.js";

export default defineExample(
  gg(armadaTonnage, aes({ x: "squadron", y: "tons" }))
    .geomCol()
    .coordFlip()
    .theme("fivethirtyeight")
    .labs({
      title: "Armada tonnage by squadron, 1588",
      subtitle: "Ordered smallest to largest, so coord flip reads bottom-up",
      x: "Squadron",
      y: "Tons",
    })
    .spec(),
);
