import { aes, gg, scaleFillContinuous } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { cholera1849 } from "./data.js";

export default defineExample(
  gg(cholera1849, aes({ x: "week", y: "weekday", fill: "deaths" }))
    .geomTile()
    .scales(scaleFillContinuous({ scheme: "viridis" }))
    // Weeks are numeric but read as a band here — one column per week — and the
    // weekday domain is reversed so Sunday sits at the top of a calendar.
    .scales({
      x: { type: "band" },
      y: { type: "band", domain: ["Sat", "Fri", "Thu", "Wed", "Tue", "Mon", "Sun"] },
    })
    .theme("dark")
    .labs({
      title: "Cholera in England and Wales, 1849",
      subtitle:
        "Registered deaths every day of the year; 53,293 in all, peaking at 1,121 on 6 September",
      x: "Week of 1849",
      y: "",
      fill: "Deaths",
    })
    .spec(),
);
