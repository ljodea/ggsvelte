# Theme equivalence evidence

This board compares R and ggsvelte renders using the same data, explicit domains, explicit breaks, explicit colors, 720×480 logical viewport, and 1440×960 output. R uses Cairo at 192 dpi. ggsvelte uses Chromium at device scale factor 2 with its bundled Roboto Condensed faces loaded and verified through `document.fonts.check()`.

Open [index.html](./index.html) for all 23 registered ggsvelte themes and the three side-by-side structural references. Raw structural measurements are in [r-metrics.json](./r-metrics.json) and [ggsvelte-metrics.json](./ggsvelte-metrics.json).

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
- ggthemes few (Medium): `#5DA5DA #FAA43A #60BD68 #F17CB0 #B2912F #B276B2 #DECF3F #F15854`
- ggthemes few_light (Light): `#88BDE6 #FBB258 #90CD97 #F6AAC9 #BFA554 #BC99C7 #EDDD46 #F07E6E`
- ggthemes few_dark (Dark): `#265DAB #DF5C24 #059748 #E5126F #9D722A #7B3A96 #C7B42E #CB2027`
- ggthemes fivethirtyeight: `#008FD5 #FF2700 #77AB43`
- ggthemes ptol (full capacity): `#332288 #6699CC #88CCEE #44AA99 #117733 #999933 #DDCC77 #661100 #CC6677 #AA4466 #882255 #AA4499`
- ggthemes canva (Fresh and bright): `#f98866 #ff420e #80bd9e #89da59`
- ggthemes gdocs: `#4285f4 #ea4335 #fbbc04 #34a853 #ff6d01 #46bdc6 #7baaf7 #f07b72 #fcd04f #71c287 #ff994d #ff994d #b3cefb #f7b4ae #fde49b #aedcba #ffc599 #c9e4e7 #ecf3fe #fdeceb #fff8e6 #ebf6ee #fff0e6 #edf8f9`
- ggthemes hc (default): `#7cb5ec #434348 #90ed7d #f7a35c #8085e9 #f15c80 #e4d354 #8085e8 #8d4653 #91e8e1`
- ggthemes hc_dark (darkunica): `#2b908f #90ee7e #f45b5b #7798BF #aaeeee #ff0066 #eeaaee #55BF3B #DF5353 #7798BF #aaeeee`
- ggthemes pander: `#56B4E9 #009E73 #F0E442 #0072B2 #D55E00 #CC79A7 #999999 #E69F00`

## Sources

- ggplot2 defaults: `/Users/liamodea/Code/ggplot2/R/theme-defaults.R`
- hrbrthemes Roboto Condensed: `/Users/liamodea/Code/hrbrthemes/R/roboto-condensed.r`
- hrbrthemes palettes: `/Users/liamodea/Code/hrbrthemes/R/color.r` and `R/flexoki.R`
- ggthemes Few: `/Users/liamodea/Code/ggthemes/R/few.R`
- ggthemes palettes: `/Users/liamodea/Code/ggthemes/data-raw/theme-data/tableau.yml`, `colorblind.yml`, `few.yml`, `fivethirtyeight.yml`, and `pault.yml`; canva palette from `/Users/liamodea/Code/ggthemes/data/canva_palettes.rda`

Reproduce everything with:

```sh
bun run render:theme-evidence
```
