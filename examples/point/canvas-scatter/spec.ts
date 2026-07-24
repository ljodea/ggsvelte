import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { cloud } from "./data.js";

export default defineExample(
  gg(cloud, aes({ x: "x", y: "y", color: "cluster" }))
    .geomPoint({ size: 1.2, alpha: 0.4 })
    // The one example that keeps generated data on purpose: its subject is the
    // canvas rendering path under 10,000 marks, not a dataset. Dark ground is
    // where overplotting at low alpha actually reads.
    .scaleColorManual({ domain: ["a", "b"], values: ["#da702c", "#4385be"] })
    .theme("dark")
    .labs({
      title: "10,000 points on a canvas stratum",
      x: "x",
      y: "y",
      color: "Cluster",
    })
    .spec(),
);
