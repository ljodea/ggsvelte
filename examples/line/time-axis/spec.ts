import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { traffic } from "./data.js";

export default defineExample(
  gg(traffic, aes({ x: "date", y: "users" }))
    .geomLine({ linewidth: 1.5 })
    .scales({ x: { type: "time" }, y: { zero: true } })
    .labs({
      title: "Daily active users, Q1 2026",
      x: "Date",
      y: "Users",
    })
    .spec(),
);
