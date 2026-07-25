import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { guerry } from "./data.js";

export default defineExample(
  gg(guerry, aes({ x: "literacy", y: "crimePersons", color: "region" }))
    .geomPoint({ size: 3 })
    .scales({ color: { type: "ordinal", scheme: "tableau10" } })
    .theme("few")
    .labs({
      title: "Literacy and crime in France, 1833",
      subtitle: "Guerry found no tidy relationship — higher means fewer crimes per head",
      x: "Literate conscripts (%)",
      y: "Population per crime against persons",
      color: "Region",
    })
    .spec(),
);
