import { aes, gg, scaleXDiscrete } from "@ggsvelte/spec";

import { defineExample } from "../../define.js";
import { soporifics } from "./data.js";

export default defineExample(
  gg(soporifics, aes({ x: "drug", y: "extraSleep" }))
    .geomPoint({
      position: "jitter",
      positionParams: { width: 0.12, height: 0, seed: 7 },
      alpha: 0.4,
      size: 2.4,
    })
    .geomErrorbar({ stat: "summary", width: 0.35, linewidth: 1.5 })
    // Control first, then the three hypnotics in the order Student tabulated
    // them; alphabetical order would put the control in the middle.
    .scales(scaleXDiscrete({ domain: ["Control", "L-hyoscyamine", "L-hyoscine", "DL-hyoscine"] }))
    .theme("hrbr")
    .labs({
      title: "The data the t-test was invented on",
      subtitle: "Cushny and Peebles, 1905: extra hours of sleep in eleven patients (mean ± se)",
      x: "Treatment",
      y: "Extra sleep (hours)",
    })
    .spec(),
);
