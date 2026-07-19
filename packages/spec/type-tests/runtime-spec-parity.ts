import type { Aes, LayerSpec, PortableSpec } from "../src/schema.js";
import type { RuntimeAes, RuntimeLayerSpec, RuntimeSpec } from "../src/runtime.js";

type KeysOfUnion<Value> = Value extends Value ? keyof Value : never;
type Assert<Condition extends true> = Condition;

export type PortableRuntimeKeyParity = Assert<
  Exclude<keyof PortableSpec, keyof RuntimeSpec> extends never ? true : false
>;
export type PortableRuntimeLayerKeyParity = Assert<
  Exclude<KeysOfUnion<LayerSpec>, KeysOfUnion<RuntimeLayerSpec>> extends never ? true : false
>;
export type PortableRuntimeAesKeyParity = Assert<
  Exclude<keyof Aes, keyof RuntimeAes> extends never ? true : false
>;

function acceptRuntimeSpec(_spec: RuntimeSpec): void {}
function acceptRuntimeLayer(_layer: RuntimeLayerSpec): void {}
function acceptRuntimeAes(_aes: RuntimeAes): void {}

declare const everyPortableSpec: PortableSpec;
declare const everyPortableLayer: LayerSpec;
declare const everyPortableAes: Aes;

// Public contract: portable values are assignable without a cast or conversion.
acceptRuntimeSpec(everyPortableSpec);
acceptRuntimeLayer(everyPortableLayer);
acceptRuntimeAes(everyPortableAes);

// Keep the fields that previously drifted visible in the proof fixture so a
// future reviewer can see the intended superset boundary at a glance.
const currentPortableSurface = {
  edition: 1,
  data: { values: [{ group: "a", x: 1, y: 2 }] },
  facet: { wrap: { field: "group" }, ncol: 2 },
  coord: { type: "flip" },
  a11y: "force-svg",
  layers: [
    {
      geom: "point",
      aes: { x: { field: "x" }, y: { field: "y" } },
      render: "canvas",
    },
  ],
} satisfies PortableSpec;

acceptRuntimeSpec(currentPortableSurface);
