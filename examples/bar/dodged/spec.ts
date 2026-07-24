import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { edgeworthDeaths } from "./data.js";

export default defineExample(
  gg(edgeworthDeaths, aes({ x: "year", fill: "county", weight: "deaths" }))
    .geomBar({ position: "dodge" })
    .scales({ fill: { type: "ordinal", scheme: "tableau10" } })
    .theme("few")
    .labs({
      title: "Deaths in six English counties, 1876–82",
      subtitle: "Edgeworth's two-way table, decades before Fisher named the method",
      x: "Year",
      y: "Deaths per million",
      fill: "County",
    })
    .spec(),
);
