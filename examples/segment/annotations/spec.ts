import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { darwinMaize } from "./data.js";

export default defineExample(
  // Finite segments - one line per row from (x,y) to (xend,yend). Unlike rule,
  // endpoints are data-mapped and do not span the panel. Here each segment runs
  // from a pair's self-fertilised height to its cross-fertilised height, so the
  // direction of the segment is Darwin's finding.
  gg(darwinMaize, aes({ x: "pair", y: "self", xend: "pair", yend: "cross", color: "winner" }))
    .geomSegment({ linewidth: 2, lineend: "round", alpha: 0.9 })
    .geomPoint({ size: 2.5, alpha: 0.6 })
    .geomPoint({ aes: { x: "pair", y: "cross" }, size: 3.2 })
    .scaleColorManual({
      domain: ["Cross-fertilised taller", "Self-fertilised taller"],
      values: ["#3a7d44", "#bc5215"],
    })
    .theme("classic")
    .labs({
      title: "Segments from start to end of each pair",
      subtitle: "Each segment runs from the self-fertilised height to the cross-fertilised height",
      x: "Pair",
      y: "Final height (inches)",
      color: "",
    })
    .spec(),
);
