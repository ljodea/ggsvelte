import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { longRunSeries } from "./data.js";

export default defineExample(
  gg(longRunSeries, aes({ x: "year", y: "value" }))
    .geomLine({ linewidth: 1.5 })
    .labs({
      title: "Long-run index, 1835–2025",
      subtitle: "Raw four-digit strings infer a calendar scale",
      x: "Year",
      y: "Index",
    })
    .spec(),
);
