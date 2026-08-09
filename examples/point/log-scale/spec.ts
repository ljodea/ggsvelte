import { aes, gg, scaleXLog10 } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { londonCholera } from "./data.js";

export default defineExample(
  gg(londonCholera, aes({ x: "density", y: "deathRate", color: "water" }))
    .geomPoint({ size: 3.5 })
    .scales(scaleXLog10({ labels: "~s" }))
    // Domain fixed so company-to-colour never depends on row order; theme palette.
    .scaleColorDiscrete({
      domain: ["Battersea", "New River", "Kew"],
      scheme: "economist",
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
