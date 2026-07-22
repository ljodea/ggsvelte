import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { REGION_LABELS, REGIONS, samples } from "./data.js";

export default defineExample(
  gg(samples, aes({ x: "quarter", y: "score", fill: { value: "#3b82f6" } }))
    .geomCol({ alpha: 0.85 })
    .facet({
      wrap: {
        field: "region",
        levels: [...REGIONS],
        labels: { ...REGION_LABELS },
      },
      ncol: 1,
      strip: { position: "left" },
    })
    .labs({
      title: "Regional score by quarter",
      subtitle: "Authored panel order with left strips",
      x: "Quarter",
      y: "Score",
    })
    .spec(),
);
