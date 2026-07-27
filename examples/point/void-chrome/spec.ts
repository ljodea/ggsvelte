import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { voidScatter } from "./data.js";

export default defineExample(
  gg(voidScatter, aes({ x: "x", y: "y", color: "group" }))
    .geomPoint({ size: 3.5 })
    .scales({ color: { type: "ordinal", scheme: "colorblind" } })
    .theme("void")
    .labs({
      title: "theme_void — marks only",
      subtitle: "No axes, grid, or panel; useful for maps, logos, and free-form composition",
      color: "Group",
    })
    .spec(),
);
