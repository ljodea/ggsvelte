import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { chestSizes } from "./data.js";

export default defineExample(
  gg(chestSizes, aes({ x: "chest", y: "soldiers" }))
    .geomCol()
    .scales({ x: { nice: false } })
    .theme("linedraw")
    .labs({
      title: "The same columns under a linedraw theme",
      subtitle: "Same chest counts with hard black lines and no grey fill",
      x: "Chest circumference (inches)",
      y: "Soldiers",
    })
    .spec(),
);
