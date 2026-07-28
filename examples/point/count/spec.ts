import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { galtonHeights } from "./data.js";

export default defineExample(
  // geom_count sizes each mark by how many rows share its (x, y). Galton
  // rounded to the inch, so 928 measurements land on 102 distinct pairs and a
  // plain scatter would show a tenth of the table.
  gg(galtonHeights, aes({ x: "parent", y: "child" }))
    .geomCount({ alpha: 0.7 })
    .theme("classic")
    .labs({
      title: "928 heights, 102 places to put them",
      subtitle: "Galton rounded to the inch; each mark is sized by how many families landed on it",
      x: "Mid-parent height (inches)",
      y: "Child height (inches)",
      size: "Children",
    })
    .spec(),
);
