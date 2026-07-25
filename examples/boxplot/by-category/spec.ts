import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { michelsonRuns } from "./data.js";

export default defineExample(
  gg(michelsonRuns, aes({ x: "run", y: "velocity" }))
    .geomBoxplot()
    .scales({ x: { domain: ["Jun 5", "Jun 7", "Jun 9", "Jun 12", "Jul 2"] } })
    .theme("few")
    .labs({
      title: "Michelson's five runs, 1879",
      subtitle: "Twenty measurements each — the runs disagree more than the readings within them",
      x: "Run",
      y: "Velocity (km/s − 299,000)",
    })
    .spec(),
);
