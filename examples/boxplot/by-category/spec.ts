import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { readings } from "./data.js";

export default defineExample(
  gg(readings, aes({ x: "instrument", y: "value" }))
    .geomBoxplot()
    .labs({
      title: "Reading spread by instrument",
      x: "Instrument",
      y: "Reading",
    })
    .spec(),
);
