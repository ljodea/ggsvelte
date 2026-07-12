import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { generation } from "./data.js";

export default defineExample(
  gg(generation, aes({ x: "year", y: "twh", fill: "source" }))
    .geomArea({ alpha: 0.9 })
    .scales({ x: { labels: "d", nice: false } })
    .labs({
      title: "Electricity generation mix",
      x: "Year",
      y: "Generation (TWh)",
      fill: "Source",
    })
    .spec(),
);
