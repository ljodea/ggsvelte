import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { armadaCrews } from "./data.js";

export default defineExample(
  gg(armadaCrews, aes({ x: "squadron", fill: "role", weight: "men" }))
    .geomBar({ position: "fill" })
    .scaleFillManual({
      domain: ["Soldiers", "Sailors"],
      values: ["#c14a3d", "#3c6e8f"],
    })
    .scales({ y: { labels: ".0%" } })
    .theme("fivethirtyeight")
    .labs({
      title: "Who sailed with the Armada, 1588",
      subtitle: "Soldiers outnumber sailors everywhere except the galleys and the light pataches",
      x: "Squadron",
      y: "Share of complement",
      fill: "Role",
    })
    .spec(),
);
