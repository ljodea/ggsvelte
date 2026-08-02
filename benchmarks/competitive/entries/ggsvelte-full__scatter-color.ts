import { registerAll, renderToSVGString } from "@ggsvelte/core";
import { aes, gg } from "@ggsvelte/spec";
import { makeScatter } from "../scenarios";

// Size-ceiling row: the full barrel now registers explicitly (#1420).
registerAll();

const data = makeScatter(1000);
const spec = gg(data, aes({ x: "x", y: "y", color: "cls" }))
  .geomPoint({ size: 1.5, alpha: 0.7 })
  .spec();
export const out = renderToSVGString(spec, { width: 800, height: 500 });
