<script lang="ts">
  import { GeomCol, GGPlot } from "@ggsvelte/svelte";

  import { languages } from "./data.js";
</script>

<GGPlot
  data={languages}
  aes={{ x: "language", y: "respondents" }}
  labs={{
    title: "Primary language for data visualisation",
    x: "Language",
    y: "Respondents",
  }}
  width={640}
  height={400}
>
  <GeomCol />
</GGPlot>
