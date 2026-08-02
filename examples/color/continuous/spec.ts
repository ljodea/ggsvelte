import { aes, gg, scaleColorContinuous } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { greatLakesSurveys, greatLakesTruth } from "./data.js";

export default defineExample(
  gg(greatLakesSurveys, aes({ x: "long", y: "lat", color: "year" }))
    .geomPoint({ size: 2.6, alpha: 0.75 })
    // The true positions are the reference the ramp is read against; without
    // them "the maps got better" would be an assertion rather than something
    // the reader can see.
    .geomPoint({
      data: greatLakesTruth,
      aes: aes({ x: "long", y: "lat", color: { value: "#ffffff" } }),
      size: 3.4,
      shape: "cross",
    })
    .scales(scaleColorContinuous({ scheme: "viridis", labels: "d" }))
    .coordFixed()
    .theme("dark")
    .labs({
      title: "Map attempts against true positions",
      subtitle: "White crosses are truth; each dot is one historical map's attempt at a point",
      x: "Longitude (°)",
      y: "Latitude (°)",
      color: "Map year",
    })
    .spec(),
);
