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
      title: "Eleven maps of the Great Lakes, 1688–1818",
      subtitle:
        "White crosses are the 39 true positions; each dot is one map's attempt at one of them",
      x: "Longitude (°)",
      y: "Latitude (°)",
      color: "Map year",
    })
    .spec(),
);
