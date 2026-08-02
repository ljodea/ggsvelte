import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { familyHeights } from "./data.js";

export default defineExample(
  gg(familyHeights, aes({ x: "child", weight: "n" }))
    // The source is Pearson and Lee's frequency table, not one row per child:
    // the weight channel makes the bin stat sum counts instead of counting
    // rows, so 81 rows stand in for 4,892 measured children.
    .geomHistogram({ bins: 18 })
    .facet({ wrap: "pair", ncol: 2 })
    .theme("ggplot2")
    .labs({
      title: "One panel per parent height class",
      subtitle:
        "Child height against the other parent; panels step through the first parent's height",
      x: "Child's height (inches)",
      y: "Children",
    })
    .spec(),
);
