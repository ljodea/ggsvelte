import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { tickets } from "./data.js";

export default defineExample(
  gg(tickets, aes({ x: "day", fill: "channel" }))
    .geomBar()
    .labs({
      title: "Support tickets by weekday",
      x: "Weekday",
      y: "Tickets",
      fill: "Channel",
    })
    .spec(),
);
