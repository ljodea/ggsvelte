import { aes, gg, scaleColorGradient } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { parisRegister } from "./data.js";

export default defineExample(
  // A two-stop continuous ramp: every year lies on top of every other, so the
  // colour is the only thing telling 1812 from 1854.
  gg(parisRegister, aes({ x: "month", y: "registered", color: "year" }))
    .geomPoint({ size: 2.6, alpha: 0.85 })
    .scales({
      ...scaleColorGradient({ low: "#132B43", high: "#56B1F7" }),
      x: { breaks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    })
    .theme("minimal")
    .labs({
      title: "Forty-three years of one register, stacked by month",
      subtitle: "Paris, 1812 to 1854; the ramp is the only thing separating the years",
      x: "Month",
      y: "Women on the register",
      color: "Year",
    })
    .spec(),
);
