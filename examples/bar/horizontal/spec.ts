import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { languages } from "./data.js";

export default defineExample(
  gg(languages, aes({ x: "language", y: "respondents" }))
    .geomCol()
    .coordFlip()
    .labs({
      title: "Survey responses by language",
      x: "Language",
      y: "Respondents",
    })
    .spec(),
);
