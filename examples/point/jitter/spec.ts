import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { drinksWages } from "./data.js";

export default defineExample(
  gg(drinksWages, aes({ x: "wageClass", y: "wage" }))
    .geomPoint({ position: "jitter", positionParams: { width: 0.22, height: 0 }, alpha: 0.75 })
    .theme("clean")
    .labs({
      title: "The same wages, jittered by position",
      subtitle: "Pearson's 70 trades again, spread by position_jitter rather than the geom sugar",
      x: "Wage class",
      y: "Weekly wage (shillings)",
    })
    .spec(),
);
