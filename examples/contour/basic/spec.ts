import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { maungaWhau } from "./data.js";

export default defineExample(
  gg(maungaWhau, aes({ x: "east", y: "north", z: "height" }))
    .geomContour({ bins: 10, linewidth: 1 })
    .coordFixed()
    .theme("classic")
    .labs({
      title: "Maunga Whau, height by height",
      subtitle: "Ten levels between 94 m and 191 m, each drawn as a line of equal height",
      x: "Metres east",
      y: "Metres north",
    })
    .spec(),
);
