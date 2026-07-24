import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { britishExports } from "./data.js";

export default defineExample(
  gg(britishExports, aes({ x: "year", y: "value" }))
    .geomLine({ linewidth: 1.5 })
    .theme("fivethirtyeight")
    .labs({
      title: "British and Irish exports, 1855–1899",
      subtitle: "Raw four-digit strings infer a calendar scale",
      x: "Year",
      y: "£ millions",
    })
    .spec(),
);
