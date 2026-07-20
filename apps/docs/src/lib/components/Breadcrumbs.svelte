<script lang="ts">
  import { base } from "$app/paths";

  const { title, reference = false }: { title: string; reference?: boolean } =
    $props();
</script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol>
    <li>
      <a href={`${base}${reference ? "/reference" : "/docs"}`}>
        {reference ? "Reference" : "Docs"}
      </a>
    </li>
    <li aria-current="page">{title}</li>
  </ol>
</nav>
