import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { polioTrial } from "./data.js";

export default defineExample(
  gg(polioTrial, aes({ x: "group", y: "rate" }))
    .geomCol({ width: 0.7 })
    .geomText({ aes: { label: "label" }, dy: -8 })
    .scales({ x: { domain: ["Vaccinated", "Placebo", "Not inoculated"] } })
    .theme("fivethirtyeight")
    .labs({
      title: "The Salk vaccine field trial, 1954",
      subtitle: "Paralytic polio per 100,000 children in the randomised arm",
      x: "Group",
      y: "Cases per 100,000",
    })
    .spec(),
);
