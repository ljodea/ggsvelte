import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { labeledRegions } from "./data.js";

export default defineExample(
  // geom_sf_text: labels at exterior-ring centroids via stat_sf_coordinates.
  gg(labeledRegions, aes({ fill: "rate", label: "region" }))
    .geomSf({ alpha: 0.55, linewidth: 0.8 })
    .geomSfText({ size: 14 })
    .theme("classic")
    .labs({
      title: "geom_sf_text region labels",
      subtitle: "Labels at representative points from GeoJSON geometries (#809)",
      fill: "rate",
    })
    .spec(),
);
