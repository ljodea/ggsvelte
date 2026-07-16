import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { rows } from "./data.js";

export default defineExample(
  gg(rows, aes({ x: "x", y: "y", color: "group" }))
    .geomPoint({ size: 4 })
    .labs({
      title: "Focus a legend group without changing the data",
      x: "Time",
      y: "Value",
      color: "Group",
    })
    .spec(),
);
