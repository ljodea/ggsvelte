<script lang="ts">
  import { GeomLine, GeomPoint, GeomRule, GGPlot } from "@ggsvelte/svelte";

  import { earthDensity } from "./data.js";
</script>

<GGPlot
  data={earthDensity}
  aes={{ x: "trial", y: "density" }}
  theme="tufte"
  labs={{
    title: "Cavendish weighs the world, 1798",
    subtitle:
      "Vertical rule: he refits the balance with a stiffer wire. Horizontal: the modern value.",
    x: "Determination",
    y: "Density of the earth (water = 1)",
  }}
  width={640}
  height={400}
>
  <GeomRule xintercept={6.5} aes={{ color: { value: "#d4615c" } }} />
  <GeomRule
    yintercept={5.517}
    linewidth={1}
    alpha={0.6}
    aes={{ color: { value: "#888888" } }}
  />
  <GeomLine linewidth={1.4} />
  <GeomPoint size={2.5} />
</GGPlot>
