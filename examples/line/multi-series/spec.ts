import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { wheatAndWages } from "./data.js";

export default defineExample(
  gg(wheatAndWages, aes({ x: "year", y: "value", color: "series" }))
    .geomLine({ linewidth: 2 })
    // Small points over the line keep the layer-composition demo this example
    // is for, and match how Playfair plotted the observations themselves —
    // at 53 readings per series they read as data marks, not clutter.
    .geomPoint({ size: 1.6 })
    // Two series on the economist's tinted paper: its own red accent for the
    // volatile price, its ink for the wage. Both clear 3:1 on #d5e4eb, where
    // most palette entries do not.
    .scaleColorManual({
      domain: ["Wheat / quarter", "Wage / week"],
      values: ["#ed111a", "#014d64"],
    })
    .scales({
      x: { breaks: [1600, 1650, 1700, 1750, 1800], labels: "d", nice: false },
    })
    .theme("economist")
    .labs({
      title: "Wheat price and a mechanic's weekly wage",
      subtitle:
        "Price of one quarter of wheat (~8 bushels) beside a week's pay — both in shillings",
      x: "Year",
      y: "Shillings",
      color: "Series",
    })
    .spec(),
);
