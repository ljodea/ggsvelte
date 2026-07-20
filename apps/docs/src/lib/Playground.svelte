<script lang="ts">
  import { pushState as pushSvelteKitState } from "$app/navigation";
  import { onMount, tick } from "svelte";

  import { copyText, MANUAL_LINK_COPY_STATUS } from "$lib/clipboard";
  import PlaygroundEditor from "$lib/components/PlaygroundEditor.svelte";
  import PlaygroundOutput from "$lib/components/PlaygroundOutput.svelte";
  import PlaygroundPreview from "$lib/components/PlaygroundPreview.svelte";
  import PlaygroundShell from "$lib/components/PlaygroundShell.svelte";
  import {
    PLAYGROUND_EXAMPLES,
    PLAYGROUND_SAMPLES,
  } from "$lib/generated/playground-seeds";
  import {
    decodePlaygroundHash,
    encodePlaygroundSeed,
    type PlaygroundSeedV1,
  } from "$lib/playground-codec";
  import { playgroundSvelteOutput } from "$lib/playground-output";
  import {
    confirmPlaygroundRendered,
    createPlaygroundState,
    editPlaygroundDraft,
    failPlaygroundCandidate,
    promotePlaygroundCandidate,
    reportPlaygroundDiagnostic,
    resetPlaygroundSource,
    setPlaygroundHistoryHash,
    stagePlaygroundDraft,
    stagePlaygroundSeed,
    type PlaygroundDiagnostic,
  } from "$lib/playground-state";

  const initialSample = PLAYGROUND_SAMPLES[0]!;
  const initialSeed: PlaygroundSeedV1 = initialSample.seed;

  let workbench = $state(createPlaygroundState(initialSeed));
  let shareUrl = $state("");
  let shareStatus = $state("");
  let shareSource = $state<HTMLElement>();

  const svelteOutput = $derived(playgroundSvelteOutput(workbench.committed));
  const selectedSample = $derived(
    workbench.seed.source.kind === "sample" ? workbench.seed.source.id : "",
  );

  function replaceLocationHash(hash: string | null): void {
    const url = new URL(window.location.href);
    url.hash = hash ?? "";
    history.replaceState(history.state, "", url);
  }

  function verifiedSharedSeed(
    hash: string,
    seed: PlaygroundSeedV1,
  ): PlaygroundSeedV1 {
    const source = seed.source;
    if (source.kind === "custom") return seed;
    const trusted =
      source.kind === "example"
        ? PLAYGROUND_EXAMPLES.some(
            (entry) =>
              entry.id === source.id &&
              entry.compatibility.supported &&
              entry.compatibility.fragment === hash,
          )
        : PLAYGROUND_SAMPLES.some(
            (entry) => entry.id === source.id && entry.fragment === hash,
          );
    return trusted ? seed : { ...seed, source: { kind: "custom" } };
  }

  function restoreLocation(origin: "initial-navigation" | "popstate"): void {
    const decoded = decodePlaygroundHash(window.location.hash);
    if (decoded.status === "absent") {
      if (origin === "popstate") {
        workbench = stagePlaygroundSeed(workbench, initialSeed, origin, null);
      }
      return;
    }
    if (decoded.status === "error") {
      replaceLocationHash(workbench.historyHash);
      workbench = reportPlaygroundDiagnostic(
        workbench,
        {
          code: decoded.error.code.toLowerCase().replaceAll("_", "-"),
          path: "#play",
          message: decoded.error.message,
          fix: "Open a generated example link or reset to a built-in sample.",
        },
        "The shared link was rejected. The current local chart and a truthful URL were retained.",
      );
      return;
    }
    workbench = stagePlaygroundSeed(
      workbench,
      verifiedSharedSeed(window.location.hash, decoded.seed),
      origin,
      window.location.hash,
    );
  }

  onMount(() => {
    restoreLocation("initial-navigation");
    const onPopState = () => restoreLocation("popstate");
    addEventListener("popstate", onPopState);
    return () => removeEventListener("popstate", onPopState);
  });

  function editDraft(draft: string): void {
    const edited = editPlaygroundDraft(workbench, draft);
    workbench = edited;
    if (!edited.synchronized) {
      shareUrl = "";
      shareStatus = "";
    }
  }

  function applyDraft(): void {
    workbench = stagePlaygroundDraft(workbench);
  }

  function resetSource(): void {
    workbench = resetPlaygroundSource(workbench);
  }

  function loadSample(id: string): boolean {
    if (id === "") return false;
    if (
      !workbench.synchronized ||
      workbench.candidate !== null ||
      workbench.seed.source.kind === "custom"
    ) {
      const discard = window.confirm(
        "Discard the current draft and load this sample? Copy it first if you need to keep it.",
      );
      if (!discard) return false;
    }
    const sample = PLAYGROUND_SAMPLES.find((entry) => entry.id === id);
    if (sample === undefined) return false;
    workbench = stagePlaygroundSeed(workbench, sample.seed, "source");
    return true;
  }

  function candidateRendered(generation: number): void {
    // Keep the inert candidate mounted briefly so assistive-technology and
    // browser tests can observe the pending state before atomic promotion.
    window.setTimeout(() => {
      const current = workbench;
      const origin = current.candidate?.origin;
      const promoted = promotePlaygroundCandidate(current, generation);
      if (promoted === current) return;
      workbench = promoted;
      if (
        (origin === "apply" || origin === "source") &&
        window.location.hash.startsWith("#play=")
      ) {
        replaceLocationHash(null);
      }
      shareUrl = "";
      shareStatus = "";
    }, 300);
  }

  function reconcileCandidateFailure(
    generation: number,
    diagnostic: PlaygroundDiagnostic,
  ): void {
    workbench = failPlaygroundCandidate(workbench, generation, diagnostic);
    if (workbench.navigationRecovery !== null) {
      replaceLocationHash(workbench.navigationRecovery.replaceHash);
    }
  }

  function activeFailed(diagnostic: PlaygroundDiagnostic): void {
    workbench = reportPlaygroundDiagnostic(
      workbench,
      diagnostic,
      "The current chart stopped safely. Reset the source to recover.",
      false,
    );
  }

  async function share(): Promise<void> {
    if (!workbench.canCopyOrShare) return;
    const hash = encodePlaygroundSeed(workbench.seed);
    const url = new URL(window.location.href);
    url.hash = hash;
    pushSvelteKitState(url, {});
    workbench = setPlaygroundHistoryHash(workbench, hash);
    shareUrl = url.href;
    await tick();
    if (shareSource === undefined) return;
    const result = await copyText(shareUrl, shareSource);
    shareStatus =
      result === "copied"
        ? "Share link copied. The PortableSpec is now in this URL and browser history."
        : MANUAL_LINK_COPY_STATUS;
  }
</script>

<section class="playground" aria-labelledby="playground-heading">
  <header class="playground-intro">
    <div>
      <p class="eyebrow">Local PortableSpec workbench</p>
      <h1 id="playground-heading">Adapt a chart, then take the Svelte</h1>
      <p class="lede">
        Start from a real example or a small sample. Edit bounded JSON, render
        it locally, and copy one complete Svelte component. No account, upload,
        remote fetch, or code execution.
      </p>
    </div>
    <div class="share-actions">
      <button type="button" onclick={share} disabled={!workbench.canCopyOrShare}
        >Share this chart</button
      >
      <p>
        Sharing explicitly puts the bounded PortableSpec in the URL and browser
        history. URL fragments are not sent with HTTP requests, but anyone with
        the link can read it.
      </p>
    </div>
  </header>

  {#if shareUrl !== ""}
    <div class="share-result">
      <code bind:this={shareSource}>{shareUrl}</code>
      <p role="status" aria-live="polite">{shareStatus}</p>
    </div>
  {/if}

  <PlaygroundShell>
    {#snippet preview()}
      <PlaygroundPreview
        rendered={workbench.rendered}
        candidate={workbench.candidate}
        lastValid={workbench.lastValid}
        status={workbench.status}
        onCandidateRendered={candidateRendered}
        onCandidateFailed={reconcileCandidateFailure}
        onActiveRendered={() =>
          (workbench = confirmPlaygroundRendered(workbench))}
        onActiveFailed={activeFailed}
      />
    {/snippet}
    {#snippet editor()}
      <PlaygroundEditor
        draft={workbench.draft}
        samples={PLAYGROUND_SAMPLES}
        {selectedSample}
        diagnostics={workbench.diagnostics}
        pending={workbench.candidate !== null}
        onEdit={editDraft}
        onApply={applyDraft}
        onReset={resetSource}
        onLoadSample={loadSample}
      />
    {/snippet}
    {#snippet output()}
      <PlaygroundOutput
        code={svelteOutput}
        enabled={workbench.canCopyOrShare}
      />
    {/snippet}
  </PlaygroundShell>
</section>

<style>
  .playground {
    width: min(100% - 2rem, 96rem);
    margin: 0 auto;
    padding-block: clamp(2rem, 5vw, 4.5rem);
  }

  .playground-intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 24rem);
    gap: clamp(2rem, 7vw, 7rem);
    align-items: end;
  }

  .eyebrow {
    margin: 0;
    color: var(--accent);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 14ch;
    margin: 0.3rem 0 1rem;
    font-size: clamp(2.7rem, 6vw, 6rem);
    line-height: 0.92;
    letter-spacing: -0.045em;
  }

  .lede {
    max-width: 48rem;
    margin: 0;
    color: var(--muted);
    font-size: 1.05rem;
  }

  .share-actions {
    display: grid;
    gap: 0.65rem;
    border-top: 1px solid var(--line);
    padding-top: 1rem;
  }

  .share-actions button {
    min-height: 44px;
    border: 1px solid var(--ink);
    border-radius: 2px;
    background: var(--ink);
    color: var(--paper);
    font: 650 0.88rem/1 var(--body-font);
    cursor: pointer;
  }

  .share-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .share-actions p,
  .share-result p {
    margin: 0;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .share-result {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    margin-top: 1rem;
    border-block: 1px solid var(--line);
    padding-block: 0.75rem;
  }

  .share-result code {
    min-width: 0;
    overflow-x: auto;
    white-space: nowrap;
  }

  @media (max-width: 47.99rem) {
    .playground {
      width: min(100% - 1.25rem, 96rem);
    }

    .playground-intro {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .share-result {
      grid-template-columns: 1fr;
    }
  }
</style>
