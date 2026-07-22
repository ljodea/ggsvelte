# Design System — ggsvelte

## Product context

ggsvelte is a layered grammar of graphics for JavaScript. It gives Svelte developers,
data practitioners, and coding agents the composability of ggplot2 with contained,
responsive browser rendering. The memorable quality is simple: a chart should look
publication-ready before its author tunes it.

This document is the visual and interaction rationale. The executable source of truth
for exact chart tokens is [`packages/core/src/theme.ts`](packages/core/src/theme.ts);
palette values live in
[`packages/core/src/scales/train.ts`](packages/core/src/scales/train.ts). When prose and
code differ, fix both in the same change and treat the code as the rendered contract.

## Aesthetic direction

- **Direction:** quiet editorial data graphics.
- **Decoration:** minimal. Typography, spacing, and data carry the hierarchy.
- **Lineage:** ggplot2's systematic grammar and clean scale treatment; hrbrthemes'
  typography, light grid hierarchy, and absent heavy frame; selected ggthemes palettes
  and theme structures.
- **Mood:** precise, calm, legible, and made for serious analysis without feeling like
  generic plotting-library output.

The plot is always the strongest visual anchor. Titles, controls, tooltips, legends,
and diagnostics support it rather than turning the chart into an application card.

## Public documentation surfaces

The documentation shell uses its own `--site-*` appearance tokens. Those tokens must
never become chart-theme defaults or alter an explicitly selected chart theme. Example
frames retain a compatibility boundary for chart-adjacent controls while chart visuals
continue to resolve only from `ThemeTokens` and `--gg-*` properties.

The site uses self-hosted Noto Sans Display for reading text and Roboto Condensed for
headlines and compact labels. Documentation pages use an editorial three-rail layout:
chapter navigation, a readable article column, and an on-this-page rail. The right rail
collapses first; on narrow screens both navigation rails become explicit native-dialog
controls. Wide code and data stay in local scroll regions rather than widening the page.

Prefer rules, whitespace, and typographic hierarchy to cards, shadows, or pill-shaped
chrome. Light and dark appearances are user-selectable and stored locally. Forced-colors
mode preserves native controls, focus outlines, boundaries, and current navigation
without relying on color alone.

## Typography

Roboto Condensed is the default chart family because its narrow proportions preserve
plotting area while keeping labels readable. The package self-hosts Light (300), Regular
(400), and Bold (700) TrueType files; rendering must not depend on a network font.

The default/hrbr hierarchy is:

| Role                 |   Size |    Weight | Use                                    |
| -------------------- | -----: | --------: | -------------------------------------- |
| Title                |   18px |       700 | Main claim, left aligned               |
| Subtitle             |   13px |       300 | Context below the title                |
| Base and tick labels | 11.5px |       300 | Axes, legends, annotations             |
| Facet strip          |   12px |       400 | Small-multiple identity                |
| Axis title           |    9px |       400 | Quiet scale context                    |
| Caption              |    9px |       300 | Source and footnote                    |
| Tool labels          |   14px | inherited | Visible interaction modes and recovery |
| Tooltip value        |   16px | inherited | Readable inspected value               |

Use tabular numerals for crosshair labels, tooltip values, and aligned numeric data.
Never substitute browser `system-ui` as the default chart face. Custom themes may
replace the full family stack, but every role must inherit that selected chart family.

## Guides and responsive presentation

Guides explain scales; they do not redefine them. Axis, legend, colorbar, and colorsteps
configuration may change titles, visibility, order, orientation, placement, spacing, and
collision treatment only. Full semantic labels remain in the scene and accessibility
surface even when visible text is abbreviated.

Automatic non-position guides stay right of the panel only above 480px when at least
320px of readable panel remains. Otherwise they move below: ramps become horizontal and
discrete keys wrap without shrinking reader typography. Explicit right and bottom guides
may occupy both zones. Merge discrete keys only when value identity, source field, labels,
title, scale family, missing-value policy, and interaction semantics all agree.

Guide dimensions come from `ThemeTokens`: guide title size, legend key size and gaps,
block gap, and colorbar thickness/minimum length. Bounded per-guide overrides may refine
one chart but must preserve the same typography hierarchy and semantic interaction target.
Static numeric ticks/bins are not tab stops; exact finite entries retain native button
semantics and complete accessible names.

## Fixed-aspect coordinates

Fixed coordinates constrain the data rectangle, never the outer chart box.
Allocate titles, captions, axes, and responsive guides first; then fit the
largest centered rectangle whose physical y-unit/x-unit ratio is exact. Panel
fill, grids, clipping, marks, axes, and facet strips occupy only that rectangle.
Unused gutters use the `letterboxFill` theme role, which defaults to `paper`,
with no grid, border, card, or host-background leak.

Fixed-scale facets use equal data-rectangle dimensions. Free positional facet
scales are incompatible because they would imply a false common physical unit.
Never stretch the requested ratio to satisfy a narrow container. Below the
64px readable threshold, retain the largest exact rectangle, remove minor
furniture, declare the layout degraded, and emit one author diagnostic.

## Color and palettes

Color is semantic, not decorative. Theme roles style chart furniture and unmapped
marks; mapped `color` and `fill` channels use trained data scales and never inherit a
theme accent accidentally.

The default/hrbr foundation is ink `#262626`, paper and panel `#ffffff`, accent
`#4385be`, grid `#cccccc`, and axis text `#4d4d4d`. The dark theme is a designed dark
surface (`#16181d` paper with `#e6e8eb` ink), not an inverted screenshot. Every rendered
theme color is exposed as a `--gg-*` CSS custom property with the resolved token as its
fallback, so hosts can adapt a chart without rerunning the plotting pipeline.

Named categorical schemes are stable data encodings:

- `observable10` is the general default.
- `ipsum` and `flexoki` preserve audited hrbrthemes source order.
- `tableau10` and `colorblind` preserve audited ggthemes source order.
- `viridis` is the sequential default.

Do not use color alone to distinguish selection from zoom, focus from selection, or an
enabled tool from a disabled one. Maintain readable text and visible outlines in forced
colors and high-contrast environments.

## Theme hierarchy

Built-in themes are structural presets, not color aliases:

- `default` and `hrbr`: Roboto Condensed, hairline grids, no heavy axis frame.
- `minimal`: reduced hierarchy and quiet grid.
- `light`: light panel border with fine ticks and axes.
- `dark`: low-glare dark surface with restrained blue accent.
- `ggplot2`: gray panel, white grid, ggplot2-like sizing and ticks.
- `classic`: no grid, visible black axes and ticks.
- `few`, `clean`, `fivethirtyeight`, `economist`, and `tufte`: retain the defining
  structural relationships of their references.

Axes and grids should look drawn, not stamped: hairline widths, short ticks only where
the theme calls for them, and no default rectangle of thick 1970s-style axes around the
panel. Data marks remain sharper and more prominent than chart furniture.

## Interaction roles

Interaction is an editorial extension of the active chart theme. These roles are
available on every resolved `ThemeTokens` object and through matching `--gg-*` custom
properties:

| Role               | Meaning                             | Built-in relationship   |
| ------------------ | ----------------------------------- | ----------------------- |
| `interactionInk`   | Controls and overlay ink            | theme ink               |
| `interactionMuted` | De-emphasized mark opacity          | `0.36`                  |
| `focusRing`        | Keyboard focus and active-mark halo | theme accent            |
| `crosshair`        | Crosshair guides                    | axis text               |
| `selectionFill`    | Selected interval interior          | accent at 18% opacity   |
| `selectionStroke`  | Selection and zoom outline          | theme accent            |
| `tooltipPaper`     | Opaque tooltip surface              | paper, then panel       |
| `tooltipInk`       | Tooltip foreground                  | theme ink               |
| `tooltipBorder`    | Tooltip hairline keyline            | grid, then panel border |
| `toolActive`       | Active tool text and underline      | theme ink               |

Custom theme objects may override any relationship. Prefer relational defaults over a
universal black, white, or blue because each theme must remain internally coherent.

### Controls and overlays

- Render a transparent, borderless tool rail only when a mode choice or recovery action
  exists. Use short text labels, 44px minimum hit height, and a restrained 2px active
  underline. Keep recovery actions visually quieter and separate from mode controls.
- Draw crosshairs as solid hairlines no heavier than an axis guide. Back only value-label
  text with opaque theme paper.
- Draw active marks with a small unfilled halo separated from the mark. Do not recolor the
  datum or confuse focus with persistent selection.
- Draw selection with a solid 1px stroke and translucent fill. Visible corner handles may
  be 6–8px, but their hit regions remain at least 44 by 44px.
- Draw zoom as an outline without interior fill and add a quiet `Zoom` tag. Selection and
  zoom differ by fill, outline, and text, not color alone.
- Use HTML tooltips with theme paper/ink, a hairline border, 2–3px radius, compact
  field/value alignment, selectable text, and an instructional footer separated by
  whitespace. Add only a restrained 1–3px elevation when the active theme needs surface
  separation.

## Layout and responsive composition

Composition responds to the chart container, never the viewport. The plot clips marks
and overlays to its own bounds.

- At 560px and wider, modes lead one tool-rail row and recovery actions trail it.
- Below 560px, modes and recovery actions become deterministic full-width rows. Labels
  remain visible; do not move them into a menu or horizontal scroller.
- Below 480px, pinned tooltip content docks directly below the plot. Crosshair and focus
  halo remain inside the panel.
- Floating pointer tooltips keep an 8px gap from the plot-root edge. Touch opens pinned,
  docked content.
- Narrow layouts spend vertical space on controls and pinned content. Never shrink axis
  labels or hide data to preserve a desktop silhouette.

Use a 4px spacing base. Prefer compact multiples of 4 and reserve larger gaps for
separating title, plot, caption, and external content. Corner radii are hierarchical:
2–3px for chart-native surfaces, 4px for ordinary host controls, and no indiscriminate
pill shapes.

## Visible states

- **SSR/hydration:** show the static chart, never a blocking spinner. If a tool rail will
  exist, reserve its footprint and keep controls disabled and busy until exact layout is
  ready.
- **Empty data:** preserve title and axes and place `No data to display` in the panel.
- **No inspectable marks:** keep an inspect-only chart rail-free and show a slim status
  line below the plot.
- **Unavailable capability:** preserve the chart, disable only that capability, show a
  short reason, and send the developer fix through diagnostics.
- **Draft area:** show an anchor, live rectangle, and `Choose opposite corner`; canceling
  removes the draft without mutating the prior selection or zoom.
- **Success:** one resolved semantic target drives mark treatment, crosshair, labels,
  narration, and tooltip. Persistent selection gets a visible Clear action; zoom gets a
  separate Reset action.
- **No nearby target:** show no overlay and no error.

## Accessibility and motion

- Provide one focusable chart surface with virtual datum navigation rather than one tab
  stop per mark. Tool, legend, tooltip, clear, and reset controls remain intentional tab
  stops with native semantics.
- Primary tools and free-standing recovery controls use 44 by 44 CSS-pixel hit regions.
  Dense legend rows may use the WCAG 2.2 24 by 24 minimum when adjacent targets do not
  overlap; a visible hairline may use a larger invisible target.
- Focus is always visible and must not be obscured by a tooltip. Escape dismisses or
  cancels the current interaction and restores focus predictably.
- Polite narration summarizes the active axis value, focused member, member count, and
  pin state once. Complete grouped details stay in labelled, navigable DOM rather than
  being spoken automatically.
- Under `forced-colors`, remove unreliable translucent fills, map focus/selection outlines
  to system colors, and preserve active-tool, zoom-label, and outline distinctions.
- Use no decorative entrance or continuous animation. Short opacity feedback is allowed
  only when reduced motion is not requested; meaning never depends on motion.

## Rejected patterns

Do not ship:

- thick default axes, heavy panel frames, or ticks that overpower data;
- generic system fonts, blurry rasterized labels, or network-only font loading;
- pill-button toolbars, icon-only modes, hidden recovery actions, or controls over marks;
- decorative gradients, large rounded chart cards, or heavy default shadows;
- dashed or animated “marching ants” selection rectangles;
- color-only state distinctions or one universal interaction accent;
- viewport breakpoints for chart internals, overflowing SVG, or overlays outside the root;
- spinners replacing SSR output, silent capability degradation, or error copy on ordinary
  no-target pointer movement.

## Change discipline

Any visual change must update the relevant executable tokens and tests. Theme changes
must be checked against default, dark, ggplot2, hrbr, and at least one ggthemes-derived
preset; interaction changes must cover narrow containers, forced colors, reduced motion,
keyboard focus, and SSR/hydration. Fresh-render and theme-equivalence artifacts are
release evidence, not optional decoration.

## Decisions log

| Date       | Decision                                                | Rationale                                                                                                      |
| ---------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 2026-07-14 | Establish quiet editorial data graphics as the system   | Matches the audited ggplot2/hrbrthemes/ggthemes references and makes good defaults the product advantage       |
| 2026-07-14 | Keep `theme.ts` as executable token truth               | Prevents prose from becoming a parallel styling implementation                                                 |
| 2026-07-14 | Derive ten interaction roles from each theme foundation | Keeps controls and overlays coherent across light, dark, and custom themes without hard-coded universal colors |
