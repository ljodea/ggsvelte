import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { samples } from "./data.js";

export default defineExample(
  // Analytic standard-normal PDF over a rug-like scatter (ggplot2 geom_function).
  // Point y lives in the data (and point-layer aes only) so geom_function keeps
  // after_stat y and does not inherit a constant y mapping (#883 Devin review).
  gg(samples, aes({ x: "x" }))
    .geomPoint({ aes: { y: "y" }, size: 2.5, alpha: 0.55 })
    .geomFunction({
      fun: "dnorm",
      n: 201,
      xlim: [-3.5, 3.5],
      args: { mean: 0, sd: 1 },
      linewidth: 2,
      alpha: 0.95,
    })
    .theme("classic")
    .labs({
      title: "Standard normal density",
      subtitle: "geom_function evaluates a portable named function (dnorm) on a grid",
      x: "x",
      y: "density",
    })
    .spec(),
);
