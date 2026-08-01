import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { fastfoodMenu } from "./data.js";

export default defineExample(
  gg(fastfoodMenu, aes({ x: "restaurant", y: "calories" }))
    .geomPoint({ position: "jitter", positionParams: { width: 0.22, height: 0 }, alpha: 0.65 })
    .theme("clean")
    .labs({
      title: "The same calories, with position jitter",
      subtitle: "position_jitter on geom_point instead of the dedicated jitter geom",
      x: "Restaurant",
      y: "Calories",
    })
    .spec(),
);
