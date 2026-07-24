import { aes, gg, scaleXLog10 } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { londonCholera } from "./data.js";

export default defineExample(
  gg(londonCholera, aes({ x: "density", y: "deathRate", color: "water" }))
    .geomPoint({ size: 3.5 })
    .scales(scaleXLog10({ labels: "~s" }))
    // Three keys picked against the economist theme's #d5e4eb paper, where most
    // palette entries fall below 3:1 contrast.
    .scaleColorManual({
      domain: ["Battersea", "New River", "Kew"],
      values: ["#d14d41", "#014d64", "#4385be"],
    })
    .theme("economist")
    .labs({
      title: "Cholera, crowding and water in London, 1849",
      subtitle: "Death rate against population density, by water company",
      x: "People per acre (log scale)",
      y: "Cholera deaths per 10,000",
      color: "Water supply",
    })
    .spec(),
);
