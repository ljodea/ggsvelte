import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { sessions } from "./data.js";

export default defineExample(
  gg(sessions, aes({ x: "age", fill: "genre" }))
    .geomBar({ position: "fill" })
    .scales({ y: { labels: ".0%" } })
    .legend({ order: "sorted" })
    .labs({
      title: "What each age group streams",
      x: "Age group",
      y: "Share of sessions",
      fill: "Genre",
    })
    .spec(),
);
