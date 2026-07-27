import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { boxedRegions } from "./data.js";

export default defineExample(
  // geom_sf_label: boxed labels at exterior-ring centroids.
  gg(boxedRegions, aes({ fill: "rate", label: "region" }))
    .geomSf({ alpha: 0.45, linewidth: 0.8 })
    .geomSfLabel({ padding: 3, radius: 2, size: 13 })
    .theme("classic")
    .labs({
      title: "geom_sf_label boxed labels",
      subtitle: "Measured paper-backed boxes at representative SF points (#809)",
      fill: "rate",
    })
    .spec(),
);
