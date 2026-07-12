<script lang="ts">
  import { GeomLine, GeomPoint, GeomRule, GGPlot } from "ggsvelte";

  import { signups, target } from "./data.js";
</script>

<GGPlot
  data={signups}
  aes={{ x: "week", y: "count" }}
  labs={{
    title: "Weekly sign-ups around launch",
    subtitle: "Vertical rule: launch week. Horizontal rule: quarter target.",
    x: "Weeks since launch",
    y: "Sign-ups",
  }}
  width={640}
  height={400}
>
  <GeomRule xintercept={0} aes={{ color: { value: "#d4615c" } }} />
  <GeomRule
    yintercept={target}
    linewidth={1}
    alpha={0.6}
    aes={{ color: { value: "#888888" } }}
  />
  <GeomLine linewidth={2} />
  <GeomPoint size={2.5} />
</GGPlot>
