import { aes, gg, guideNone } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { pumpNeighbourhoods } from "./data.js";

export default defineExample(
  // Same map and same representative points as sf/labels, but geom_sf_label
  // measures each string and sets it on a padded box, so the name survives a
  // busy fill instead of dissolving into it.
  gg(pumpNeighbourhoods, aes({ fill: "pump", label: "pump" }))
    .geomSf({ alpha: 0.75, linewidth: 0.8 })
    .geomSfLabel({ padding: 3, radius: 2, size: 11 })
    .guides({ fill: guideNone() })
    .coordFixed()
    .theme("classic")
    .labs({
      title: "The same names, on paper",
      subtitle: "Each pump name sits on a measured box so the map stays readable",
    })
    .spec(),
);
