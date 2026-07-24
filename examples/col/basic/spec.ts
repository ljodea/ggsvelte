import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { chestSizes } from "./data.js";

export default defineExample(
  gg(chestSizes, aes({ x: "chest", y: "soldiers" }))
    .geomCol()
    .scales({ x: { nice: false } })
    .theme("classic")
    .labs({
      title: "Chests of 5,738 Scottish soldiers",
      subtitle: "The measurements that made the normal curve a claim about people",
      x: "Chest circumference (inches)",
      y: "Soldiers",
    })
    .spec(),
);
