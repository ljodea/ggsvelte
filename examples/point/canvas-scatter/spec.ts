import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { CANVAS_SCATTER_MARKS, cloud } from "./data.js";

export default defineExample(
  gg(cloud, aes({ x: "x", y: "y", color: "cluster" }))
    .geomPoint({ size: 1.2, alpha: 0.4 })
    // Subject is the canvas rendering path above CANVAS_AUTO_THRESHOLD, not a
    // dataset. Dark ground is where overplotting at low alpha actually reads.
    .scaleColorManual({ domain: ["a", "b"], values: ["#da702c", "#4385be"] })
    .theme("dark")
    .labs({
      title: `${CANVAS_SCATTER_MARKS.toLocaleString("en-US")} points on a canvas stratum`,
      subtitle:
        "Above the automatic threshold the marks go to canvas instead of SVG; the cloud is seeded, because the subject here is the render path",
      x: "x",
      y: "y",
      color: "Cluster",
    })
    .spec(),
);
