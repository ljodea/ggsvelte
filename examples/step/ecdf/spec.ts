import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { ecdfSample } from "./data.js";

export default defineExample(
  // ggplot2 geom_step with direction "hv" (default): horizontal then vertical —
  // the standard stairs for an empirical distribution function.
  gg(ecdfSample, aes({ x: "x", y: "y" }))
    .geomStep({ direction: "hv", linewidth: 1.8 })
    .geomPoint({ size: 2.2, alpha: 0.85 })
    .theme("classic")
    .labs({
      title: "Empirical CDF as a step line",
      subtitle: "geom_step direction hv — horizontal, then vertical",
      x: "x",
      y: "F̂(x)",
    })
    .spec(),
);
