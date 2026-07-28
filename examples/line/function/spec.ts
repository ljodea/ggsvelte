import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { chestSizes } from "./data.js";

export default defineExample(
  // geom_function evaluates a portable named function on a grid, so the curve
  // is the claim and the points are the evidence. Quetelet's classes are one
  // inch wide, which is what makes a share directly comparable with a density.
  gg(chestSizes, aes({ x: "chest" }))
    .geomPoint({ aes: { y: "share" }, size: 3 })
    .geomFunction({
      fun: "dnorm",
      n: 201,
      xlim: [32, 49],
      args: { mean: 39.83, sd: 2.05 },
      linewidth: 2,
      alpha: 0.95,
    })
    .theme("classic")
    .labs({
      title: "Quetelet's soldiers and the error curve",
      subtitle: "5,738 Scottish chests against a normal with the same mean and spread",
      x: "Chest circumference (inches)",
      y: "Share of soldiers",
    })
    .spec(),
);
