import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { darwinMaize } from "./data.js";

export default defineExample(
  // Curved connectors (ggplot2 geom_curve): same (x,y)→(xend,yend) contract as
  // segment, but tessellated as a quadratic Bezier in panel px so curvature is
  // aspect-safe. Here each curve runs self → cross for Darwin's maize pairs.
  gg(darwinMaize, aes({ x: "pair", y: "self", xend: "pair", yend: "cross", color: "winner" }))
    .geomCurve({ linewidth: 2, lineend: "round", curvature: 0.4, alpha: 0.9 })
    .geomPoint({ size: 2.5, alpha: 0.6 })
    .geomPoint({ aes: { x: "pair", y: "cross" }, size: 3.2 })
    .scaleColorManual({
      domain: ["Cross-fertilised taller", "Self-fertilised taller"],
      values: ["#3a7d44", "#bc5215"],
    })
    .theme("classic")
    .labs({
      title: "Darwin's maize, curved",
      subtitle: "Fifteen pairs; each curve runs self → cross (geom_curve)",
      x: "Pair",
      y: "Final height (inches)",
      color: "",
    })
    .spec(),
);
