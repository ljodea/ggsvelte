import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { eruptions } from "./data.js";

export default defineExample(
  // Data-driven form: aes.x is mapped, so every row draws one vertical rule
  // spanning the panel — a rug of the waiting-time distribution.
  gg(eruptions, aes({ x: "waiting" }))
    .geomRule({ alpha: 0.35, linewidth: 1.5 })
    .labs({
      title: "Waiting times between eruptions",
      subtitle: "One data-driven rule per observation",
      x: "Waiting time (minutes)",
    })
    .spec(),
);
