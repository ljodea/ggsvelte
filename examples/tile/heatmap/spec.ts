import { aes, gg } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { staffing } from "./data.js";

export default defineExample(
  gg(staffing, aes({ x: "dept", y: "shift", fill: "n" }))
    .geomTile()
    .labs({
      title: "Staffing intensity by department and shift",
      x: "Department",
      y: "Shift",
    })
    .spec(),
);
