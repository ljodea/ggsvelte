import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { britishFinances } from "./data.js";

export default defineExample(
  gg(britishFinances, aes({ x: "year", y: "value", color: "series" }))
    .geomLine({ linewidth: 2.2 })
    .geomPoint({ size: 2.6 })
    .scales({ x: { labels: "d" } })
    .theme("fivethirtyeight")
    .labs({
      title: "Playfair's fiscal three, 1770–1824",
      subtitle: "Filter any series; restored groups keep their original color",
      x: "Year",
      y: "Playfair's index units",
      color: "Series",
    })
    .spec(),
);
