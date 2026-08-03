# TODOS

## Audit colorblind-safety of all categorical schemes

- **What:** Simulate deuteranopia / protanopia / tritanopia distinguishability across every categorical scheme's color sequence and publish the verified `CB-safe` set.
- **Why:** The palettes chooser (`/palettes`) marks `CB-safe` only for self-declared schemes (`colorblind`, `tableau_colorblind`, `pander`). Unmarked currently means "unaudited," not "unsafe" — users with color vision deficiency are guessing on ~47 schemes.
- **Pros:** `CB-safe` becomes a trustworthy, complete signal; likely widens the set of endorsable schemes; produces a defensible methodology note for the docs.
- **Cons:** Perceptual analysis is a research task with its own verification surface (simulator choice, distinguishability threshold, ties in pairwise distance); not a mechanical change.
- **Context:** Filed from the /palettes redesign design review (2026-08-02, decision D6). The redesign shipped marks for self-declared schemes only as a stopgap; this audit replaces the stopgap. Source doc-comments in `packages/core/src/scales/categorical-palettes.ts` already claim colorblind-safety for some schemes — verify, don't trust.
- **Depends on / blocked by:** The palettes redesign (index rows rendering the `CB-safe` tag) must land first so the audit has a surface to publish into.
