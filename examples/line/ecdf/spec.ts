import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { deadlyQuarrels } from "./data.js";

export default defineExample(
  // stat ecdf computes F̂ from the raw sample; curve step-hv draws the stairs
  // right-continuous, and pad extends them to the panel edges at 0 and 1.
  gg(deadlyQuarrels, aes({ x: "magnitude" }))
    .geomLine({ stat: "ecdf", curve: "step-hv", linewidth: 1.8, pad: true })
    .theme("classic")
    .labs({
      title: "How deadly was the average quarrel?",
      subtitle: "779 pairs of belligerents, 1807 to 1949, by Richardson's log10 death toll",
      x: "Magnitude (log10 killed)",
      y: "Share of quarrels at or below",
    })
    .spec(),
);
