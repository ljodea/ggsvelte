import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { guerry } from "./data.js";

export default defineExample(
  gg(guerry, aes({ x: "literacy", y: "crimePersons", color: "region" }))
    .geomPoint({ size: 3 })
    .scales({ color: { type: "ordinal", scheme: "tableau10" } })
    .theme("few")
    .labs({
      title: "Two measures coloured by region",
      subtitle: "Literacy against crime rate; colour marks the region of each department",
      x: "Literate conscripts (%)",
      y: "Population per crime against persons",
      color: "Region",
    })
    .spec(),
);
