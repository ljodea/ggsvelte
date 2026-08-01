import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { fastfoodMenu } from "./data.js";

export default defineExample(
  gg(fastfoodMenu, aes({ x: "restaurant", y: "calories" }))
    .geomJitter({ width: 0.22, height: 0, alpha: 0.65 })
    .theme("clean")
    .labs({
      title: "Menu calories, spread so items do not stack",
      subtitle: "Each point is one entrée. Jitter separates items that share a restaurant",
      x: "Restaurant",
      y: "Calories",
    })
    .spec(),
);
