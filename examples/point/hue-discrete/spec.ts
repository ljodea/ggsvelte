import { aes, gg, scaleColorHue } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { armadaSquadrons } from "./data.js";

export default defineExample(
  // Ten categories with no order between them: scale_color_hue walks the
  // colour wheel at even spacing so no squadron reads as ranked above another.
  gg(armadaSquadrons, aes({ x: "ships", y: "men", color: "squadron" }))
    .geomPoint({ size: 5 })
    .scales(scaleColorHue())
    .theme("minimal")
    .labs({
      title: "How the Armada was loaded",
      subtitle: "Ten squadrons, ships against men aboard; the galleys carried theirs in four hulls",
      x: "Ships",
      y: "Soldiers and sailors",
      color: "Squadron",
    })
    .spec(),
);
