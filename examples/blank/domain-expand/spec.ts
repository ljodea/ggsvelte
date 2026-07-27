import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { plannedRange } from "./data.js";

export default defineExample(
  // geom_blank trains scales from x_plan/y_plan without drawing those rows.
  // Points stay clustered; axes open to the full planned range (ggplot2 geom_blank).
  gg(plannedRange, aes({ x: "x", y: "y" }))
    .geomPoint({ size: 3.5, alpha: 0.9 })
    .geomBlank({ aes: aes({ x: "x_plan", y: "y_plan" }) })
    .theme("classic")
    .labs({
      title: "Expand scales without extra marks",
      subtitle: "geom_blank maps x_plan / y_plan for domain training only",
      x: "x (observed)",
      y: "y (observed)",
    })
    .spec(),
);
