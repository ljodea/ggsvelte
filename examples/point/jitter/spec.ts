import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { ratings } from "./data.js";

export default defineExample(
  gg(ratings, aes({ x: "team", y: "score" }))
    .geomPoint({
      position: "jitter",
      positionParams: { width: 0.16, height: 0.12 },
      alpha: 0.45,
      size: 2.5,
    })
    .labs({
      title: "Score spread by team (seeded jitter)",
      x: "Team",
      y: "Score",
    })
    .spec(),
);
