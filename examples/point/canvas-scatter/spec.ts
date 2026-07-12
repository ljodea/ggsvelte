import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { cloud } from "./data.js";

export default defineExample(
  gg(cloud, aes({ x: "x", y: "y", color: "cluster" }))
    .geomPoint({ size: 1.2, alpha: 0.4 })
    .labs({
      title: "10,000 points on a canvas stratum",
      x: "x",
      y: "y",
      color: "Cluster",
    })
    .spec(),
);
