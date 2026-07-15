import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { field } from "./data.js";

export default defineExample(
  gg(field, aes({ x: "x", y: "y", color: "group" }))
    .geomPoint({ size: 2.5, alpha: 0.8 })
    .labs({
      title: "Select an interval or brush to zoom",
      x: "x",
      y: "y",
      color: "Group",
    })
    .spec(),
);
