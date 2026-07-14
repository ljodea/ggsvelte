# Theme equivalence evidence

This board compares R and ggsvelte renders using the same data, explicit domains, explicit breaks, explicit colors, 720×480 logical viewport, and 1440×960 output. R uses Cairo at 192 dpi. ggsvelte uses Chromium at device scale factor 2 with its bundled Roboto Condensed faces loaded and verified through `document.fonts.check()`.

Open [index.html](./index.html) for the side-by-side board. Raw structural measurements are in [r-metrics.json](./r-metrics.json) and [ggsvelte-metrics.json](./ggsvelte-metrics.json).

## Structural parity

| Contract            | R reference                                    | ggsvelte                                                    | Result                              |
| ------------------- | ---------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| ggplot2 tick labels | x `1–6`; y `0–10` by 2                         | exact same arrays                                           | Exact                               |
| ggplot2 axis lines  | none                                           | 0 axis lines                                                | Exact                               |
| ggplot2 ticks       | x + y                                          | 12 tick lines                                               | Exact                               |
| ggplot2 major grids | x + y, white, linewidth 0.5                    | 12 lines, white, width 0.5                                  | Exact                               |
| ggplot2 typography  | base 11, axis 8.8, title 13.2, axis title 11   | same sizes; Roboto Condensed family                         | Exact hierarchy                     |
| hrbr axis lines     | none                                           | 0 axis lines                                                | Exact                               |
| hrbr ticks          | none                                           | 0 tick lines                                                | Exact                               |
| hrbr major grids    | x + y, `#cccccc`, R linewidth 0.2              | 12 lines, `#cccccc`, CSS/SVG width 0.4                      | Same visible contract; units differ |
| hrbr typography     | base 11.5, title 18, subtitle 13, axis title 9 | exact sizes and bundled Roboto Condensed Light/Regular/Bold | Exact                               |
| Few border          | panel border, no axis lines                    | 1 panel border, 0 axis lines                                | Exact                               |
| Few ticks and grid  | x + y ticks, no grid                           | 12 tick lines, 0 grid lines                                 | Exact                               |
| Few typography      | base 12, axis 9.6, title 14.4, axis title 12   | exact sizes; Roboto Condensed family                        | Exact hierarchy                     |

The R and browser rasterizers do not produce byte-identical glyph antialiasing, so equivalence is asserted on theme structure, declared values, tick arrays, visibility, and typography hierarchy. The screenshots are perceptual evidence, not a pixel-equality claim.

## Palette parity

The named palettes are copied in source order and asserted in `packages/core/tests/palettes.test.ts`:

- hrbrthemes `ipsum`: `#d18975 #8fd175 #3f2d54 #75b8d1 #2d543d #c9d175 #d1ab75 #d175b8 #758bd1`
- hrbrthemes Flexoki Light: `#D14D41 #DA702C #D0A215 #879A39 #3AA99F #4385BE #8B7EC8 #CE5D97`
- ggthemes Tableau 10: `#4E79A7 #F28E2B #E15759 #76B7B2 #59A14F #EDC948 #B07AA1 #FF9DA7 #9C755F #BAB0AC`
- ggthemes colorblind: `#000000 #E69F00 #56B4E9 #009E73 #F0E442 #0072B2 #D55E00 #CC79A7`

## Sources

- ggplot2 defaults: `/Users/liamodea/Code/ggplot2/R/theme-defaults.R`
- hrbrthemes Roboto Condensed: `/Users/liamodea/Code/hrbrthemes/R/roboto-condensed.r`
- hrbrthemes palettes: `/Users/liamodea/Code/hrbrthemes/R/color.r` and `R/flexoki.R`
- ggthemes Few: `/Users/liamodea/Code/ggthemes/R/few.R`
- ggthemes palettes: `/Users/liamodea/Code/ggthemes/data-raw/theme-data/tableau.yml` and `colorblind.yml`

Reproduce everything with:

```sh
bun run render:theme-evidence
```
