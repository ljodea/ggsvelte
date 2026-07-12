import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { responses } from "./data.js";

export default defineExample(
  gg(responses, aes({ x: "ms" }))
    .geomHistogram({ binwidth: 20, boundary: 0 })
    .labs({
      title: "Response time distribution",
      x: "Response time (ms)",
      y: "Count",
    })
    .spec(),
);
