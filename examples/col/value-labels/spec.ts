import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { revenue } from "./data.js";

export default defineExample(
  gg(revenue, aes({ x: "quarter", y: "amount" }))
    .geomCol({ width: 0.7 })
    .geomText({ aes: aes({ label: "label" }), dy: -8, size: 11 })
    .labs({
      title: "Quarterly revenue",
      x: "Quarter",
      y: "Revenue (€ thousands)",
    })
    .spec(),
);
