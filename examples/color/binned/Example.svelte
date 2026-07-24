<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { jevonsTrials } from "./data.js";
</script>

<GGPlot
  data={jevonsTrials}
  aes={{ x: "actual", y: "estimated", color: "trials" }}
  theme="light"
  scales={{
    color: {
      type: "binned",
      breaks: [0, 5, 20, 60, 130],
      range: ["#d3d3d0", "#8ba89c", "#4f8a6e", "#1e5c43"],
    },
  }}
  guides={{
    color: { type: "colorsteps", position: "bottom", direction: "horizontal" },
  }}
  labs={{
    title: "How many beans can you see at once?",
    subtitle:
      "Jevons threw beans into a box 1,027 times — never wrong up to four",
    x: "Beans actually thrown",
    y: "Beans estimated",
    color: "Trials",
  }}
  width={640}
  height={400}
>
  <GeomPoint size={5} />
</GGPlot>
