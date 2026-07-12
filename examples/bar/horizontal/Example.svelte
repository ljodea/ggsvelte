<script lang="ts">
  import { GeomCol, GGPlot } from "ggsvelte";

  import { languages } from "./data.js";
</script>

<GGPlot
  data={languages}
  aes={{ x: "language", y: "respondents" }}
  coord="flip"
  labs={{
    title: "Survey responses by language",
    x: "Language",
    y: "Respondents",
  }}
  width={640}
  height={400}
>
  <GeomCol />
</GGPlot>
