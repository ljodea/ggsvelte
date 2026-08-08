import {
  aes,
  gg,
  scaleColorManual,
  scaleLinewidthContinuous,
  scaleXContinuous,
} from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import {
  campaignRivers,
  minardCityLabels,
  minardStrengthLabels,
  minardTroopsWithCold,
} from "./data.js";

export default defineExample(
  // Minard's flow map: band width carries surviving strength, so linewidth is
  // a mapped aesthetic here, and geom_path keeps row order within each leg -
  // the retreat walks back over the longitudes of the advance. Cold dates are
  // stamped onto retreat vertices (minardTroopsWithCold) for the Svelte pin.
  // PortableSpec has no custom Inspect content; date stays on the data table
  // (not mapped as label) so static renders match the band without empty
  // kitchen-sink fields. The Svelte surface stacks the temperature strip under
  // this map; a single PortableSpec describes the map panel only.
  gg(minardTroopsWithCold, aes({ x: "long", y: "lat" }))
    .geomPath({
      data: campaignRivers,
      aes: aes({ group: "river", color: { value: "#8fa8c0" } }),
      linewidth: 0.8,
      alpha: 0.7,
      inspect: false,
    })
    .geomPath({
      aes: aes({
        group: "leg",
        color: "direction",
        linewidth: "survivors",
      }),
    })
    .geomText({
      data: minardCityLabels,
      aes: aes({ x: "lx", y: "ly", label: "city", color: { value: "#4a4237" } }),
      size: 10,
      dy: -9,
      inspect: false,
    })
    .geomText({
      data: minardStrengthLabels,
      aes: aes({ label: "count", color: { value: "#6b5d4a" } }),
      size: 9,
      inspect: false,
    })
    .scales({
      ...scaleXContinuous({ limits: [23.5, 38.2] }),
      ...scaleColorManual({
        domain: ["Advance", "Retreat"],
        values: ["#d3a05e", "#25221e"],
        guide: { type: "legend", position: "bottom" },
      }),
      ...scaleLinewidthContinuous({
        range: [1, 18],
        guide: { type: "legend", position: "bottom" },
      }),
    })
    .coordFixed({ ratio: 1.6 })
    .theme("classic")
    .labs({
      title: "The Grande Armée's march to Moscow and back, 1812–13",
      subtitle:
        "Band width is the number of men still with the column — after Minard's 1869 figurative map",
      x: "",
      y: "",
      color: "",
      linewidth: "Survivors",
    })
    .spec(),
);
