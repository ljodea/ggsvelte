import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { overplotSample } from "./data.js";

export default defineExample(
  // ggplot2 geom_count: point size encodes how many rows share each (x, y).
  gg(overplotSample, aes({ x: "x", y: "y", color: "species" }))
    .geomCount({ alpha: 0.75 })
    .theme("classic")
    .labs({
      title: "Overplotting counts",
      subtitle: "geom_count — size is after_stat n at unique (x, y)",
      x: "x",
      y: "y",
      color: "Species",
      size: "n",
    })
    .spec(),
);
