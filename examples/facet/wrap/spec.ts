import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { samples } from "./data.js";

export default defineExample(
  gg(samples, aes({ x: "ms" }))
    .geomHistogram({ bins: 18 })
    .facet({ wrap: "service", ncol: 3 })
    .labs({
      title: "Response time by service",
      x: "Response time (ms)",
      y: "Requests",
    })
    .spec(),
);
