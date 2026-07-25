import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { drinksWages } from "./data.js";

export default defineExample(
  gg(drinksWages, aes({ x: "wageClass", y: "wage" }))
    .geomPoint({ position: "jitter", positionParams: { width: 0.22, height: 0 }, alpha: 0.75 })
    .theme("clean")
    .labs({
      title: "Wages across 70 trades, 1910",
      subtitle: "Jitter separates trades that share a wage class",
      x: "Wage class",
      y: "Weekly wage (shillings)",
    })
    .spec(),
);
