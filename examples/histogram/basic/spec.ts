import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { michelson } from "./data.js";

export default defineExample(
  gg(michelson, aes({ x: "velocity" }))
    .geomHistogram({ binwidth: 40 })
    // 734.5 is the modern value on Michelson's own distance scale: the whole
    // distribution sits below it, which is the point of showing the rule.
    .geomRule({ xintercept: 734.5, linewidth: 1.2, aes: aes({ color: { value: "#d14d41" } }) })
    .theme("fivethirtyeight")
    .labs({
      title: "Michelson measures the speed of light, 1879",
      subtitle: "100 runs, km/s less 299,000 — the true value sits off the centre",
      x: "Velocity (km/s − 299,000)",
      y: "Runs",
    })
    .spec(),
);
