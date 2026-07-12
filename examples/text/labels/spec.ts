import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { cities } from "./data.js";

export default defineExample(
  gg(cities, aes({ x: "rent", y: "livability" }))
    .geomPoint({ size: 3 })
    .geomText({ aes: aes({ label: "city" }), dy: -9, size: 10 })
    .scales({ x: { labels: ",d" } })
    .labs({
      title: "Livability vs median rent",
      x: "Median monthly rent (USD)",
      y: "Livability index",
    })
    .spec(),
);
