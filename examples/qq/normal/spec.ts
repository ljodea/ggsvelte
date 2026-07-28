import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { michelson } from "./data.js";

export default defineExample(
  gg(michelson, aes({ sample: "velocity" }))
    .geomQq({ size: 2.5, alpha: 0.85 })
    .geomQqLine({ linewidth: 1.2, alpha: 0.7 })
    .theme("classic")
    .labs({
      title: "Were Michelson's errors normal?",
      subtitle: "His 100 runs against the normal they would follow if only chance moved them",
      x: "Normal quantile",
      y: "Speed of light, km/s less 299,000",
    })
    .spec(),
);
