import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { countries } from "./data.js";

export default defineExample(
  gg(countries, aes({ x: "gdp", y: "lifeExp", color: "region" }))
    .geomPoint({ size: 3.5 })
    .scales({ x: { type: "log", labels: "~s" } })
    .labs({
      title: "Income and life expectancy",
      x: "GDP per capita (USD, log scale)",
      y: "Life expectancy (years)",
      color: "Region",
    })
    .spec(),
);
