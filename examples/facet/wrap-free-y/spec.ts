import { aes, gg, guideNone } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { londonBills } from "./data.js";

export default defineExample(
  gg(londonBills, aes({ x: "year", y: "value", color: "measure" }))
    .geomLine({ linewidth: 1.6 })
    .facet({
      wrap: {
        field: "measure",
        levels: ["Male / female ratio", "Male christenings", "All burials", "Plague deaths"],
      },
      ncol: 2,
      scales: "free_y",
    })
    .scales({ x: { labels: "d" } })
    .guides({ color: guideNone() })
    .theme("fivethirtyeight")
    .labs({
      title: "London's bills of mortality, 1629–1710",
      subtitle: "The ratio never once falls below 1 — Arbuthnot's argument, on its own scale",
      x: "Year",
      y: "",
    })
    .spec(),
);
