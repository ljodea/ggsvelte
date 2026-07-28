import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { aboveOneEighty } from "./data.js";

export default defineExample(
  // A GeometryCollection expands to its leaf geometries, so one row can be two
  // shapes on the ground and still carry one set of aesthetics.
  gg(aboveOneEighty, aes({ fill: "ground" }))
    .geomSf({ alpha: 0.85, linewidth: 0.9 })
    .coordFixed()
    .theme("classic")
    .labs({
      title: "One feature, two pieces of ground",
      subtitle: "Everything on Maunga Whau above 180 m: the summit ridge and a rise east of it",
      fill: "",
    })
    .spec(),
);
