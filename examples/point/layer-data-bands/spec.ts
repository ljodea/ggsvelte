import { gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { bands, callouts, observations } from "./data.js";

export default defineExample(
  gg()
    .geomRect({
      data: bands,
      aes: {
        xmin: "xmin",
        xmax: "xmax",
        ymin: "ymin",
        ymax: "ymax",
        fill: "region",
      },
      alpha: 0.2,
    })
    .geomPoint({
      data: observations,
      aes: { x: "x", y: "y", color: "group" },
      size: 2.5,
      alpha: 0.85,
    })
    .geomText({
      data: callouts,
      aes: { x: "x", y: "y", label: "label" },
      size: 12,
    })
    .labs({
      title: "Per-layer data: observations, bands, and a callout",
      x: "x",
      y: "y",
      color: "Group",
      fill: "Region",
    })
    .spec(),
);
