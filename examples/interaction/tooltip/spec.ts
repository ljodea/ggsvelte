import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { penguins } from "./data.js";

export default defineExample(
  gg(penguins, aes({ x: "flipper", y: "mass", color: "species" }))
    .geomPoint({ size: 3, alpha: 0.8 })
    .theme("light")
    .labs({
      title: "Inspect a shared x value, then pin",
      subtitle:
        "333 Palmer Archipelago penguins; flipper length is measured to the millimetre, so many birds share one",
      x: "Flipper length (mm)",
      y: "Body mass (g)",
      color: "Species",
    })
    .spec(),
);
