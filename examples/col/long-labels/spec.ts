import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { filings } from "./data.js";

export default defineExample(
  gg(filings, aes({ x: "category", y: "count" }))
    .geomCol()
    .labs({
      title: "Filing types (long category labels)",
      x: "Category",
      y: "Count",
    })
    .spec(),
);
