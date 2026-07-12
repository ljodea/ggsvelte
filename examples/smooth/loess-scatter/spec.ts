import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { trend } from "./data.js";

export default defineExample(
  gg(trend, aes({ x: "dose", y: "effect" }))
    .geomPoint({ alpha: 0.55, size: 2.5 })
    .geomSmooth({ method: "loess", span: 0.75 })
    .labs({
      title: "Dose response with a loess trend",
      x: "Dose",
      y: "Effect",
    })
    .spec(),
);
