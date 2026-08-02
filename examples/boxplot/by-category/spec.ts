import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { michelsonRuns } from "./data.js";

export default defineExample(
  gg(michelsonRuns, aes({ x: "run", y: "velocity" }))
    .geomBoxplot()
    .scales({ x: { domain: ["Jun 5", "Jun 7", "Jun 9", "Jun 12", "Jul 2"] } })
    .theme("few")
    .labs({
      title: "Boxplots for five runs of the same experiment",
      subtitle:
        "Twenty measurements per run; the boxes show the runs disagree more than readings within a run",
      x: "Run",
      y: "Velocity (km/s − 299,000)",
    })
    .spec(),
);
