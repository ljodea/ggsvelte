import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { signups, target } from "./data.js";

export default defineExample(
  gg(signups, aes({ x: "week", y: "count" }))
    // Annotation form: fixed intercepts, inherits NO plot aes (like
    // ggplot2's geom_vline/geom_hline with inherit.aes = FALSE).
    .geomRule({ xintercept: 0, aes: aes({ color: { value: "#d4615c" } }) })
    .geomRule({
      yintercept: target,
      linewidth: 1,
      alpha: 0.6,
      aes: aes({ color: { value: "#888888" } }),
    })
    .geomLine({ linewidth: 2 })
    .geomPoint({ size: 2.5 })
    .labs({
      title: "Weekly sign-ups around launch",
      subtitle: "Vertical rule: launch week. Horizontal rule: quarter target.",
      x: "Weeks since launch",
      y: "Sign-ups",
    })
    .spec(),
);
