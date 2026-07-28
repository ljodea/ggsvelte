import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { napoleonsArmy } from "./data.js";

export default defineExample(
  // geom_path connects in data (row) order within each group. The retreat
  // walks back over the longitudes of the advance, so sorting by x - which is
  // what geom_line does - would splice the two legs into nonsense.
  gg(napoleonsArmy, aes({ x: "long", y: "survivors", group: "leg", color: "direction" }))
    .geomPath({ linewidth: 2 })
    .geomPoint({ size: 2.2, alpha: 0.7 })
    .scaleColorManual({
      domain: ["Advance", "Retreat"],
      values: ["#b45309", "#1f2937"],
    })
    .theme("classic")
    .labs({
      title: "Napoleon's army marches east and dies coming back",
      subtitle: "Minard's 1812 strength counts, drawn in march order: out to Moscow, then home",
      x: "Longitude east",
      y: "Men still with the column",
      color: "",
    })
    .spec(),
);
