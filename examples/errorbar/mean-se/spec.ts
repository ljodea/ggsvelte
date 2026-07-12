import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { yields } from "./data.js";

export default defineExample(
  gg(yields, aes({ x: "treatment", y: "yield_" }))
    .geomPoint({
      position: "jitter",
      positionParams: { width: 0.12, height: 0, seed: 7 },
      alpha: 0.35,
      size: 2,
    })
    .geomErrorbar({ stat: "summary", width: 0.35, linewidth: 1.5 })
    .labs({
      title: "Yield by treatment (mean ± standard error)",
      x: "Treatment",
      y: "Yield",
    })
    .spec(),
);
