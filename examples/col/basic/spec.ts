import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { languages } from "./data.js";

export default defineExample(
  gg(languages, aes({ x: "language", y: "respondents" }))
    .geomCol()
    .labs({
      title: "Primary language for data visualisation",
      x: "Language",
      y: "Respondents",
    })
    .spec(),
);
