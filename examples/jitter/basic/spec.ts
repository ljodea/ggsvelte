import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { drinksWages } from "./data.js";

export default defineExample(
  // geom_jitter is sugar for point + position jitter (#818).
  gg(drinksWages, aes({ x: "wageClass", y: "wage" }))
    .geomJitter({ width: 0.22, height: 0, alpha: 0.75 })
    .theme("clean")
    .labs({
      title: "Wages across 70 trades, 1910",
      subtitle: "geom_jitter separates trades that share a wage class",
      x: "Wage class",
      y: "Weekly wage (shillings)",
    })
    .spec(),
);
