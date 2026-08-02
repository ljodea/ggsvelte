import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { crimeanMortality } from "./data.js";

export default defineExample(
  gg(crimeanMortality, aes({ x: "month", y: "deaths", fill: "cause" }))
    .geomArea({ alpha: 0.9 })
    // The economist theme paints on #d5e4eb, where most palette entries fall
    // below 3:1 — these three are chosen against that ground (7.2:1, 3.3:1,
    // 3.0:1), and the domain is explicit so cause-to-colour never depends on
    // row order.
    .scaleFillManual({
      domain: ["Disease", "Wounds", "Other"],
      values: ["#d14d41", "#014d64", "#4385be"],
    })
    .scales({ x: { labels: "%b %Y" } })
    .theme("economist")
    .labs({
      title: "Stacked deaths by cause over time",
      subtitle: "Monthly rates split so each band is one cause of death",
      x: "Month",
      y: "Deaths per 1,000 per year",
      fill: "Cause",
    })
    .spec(),
);
