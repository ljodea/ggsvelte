# Theme equivalence evidence

This board compares R and ggsvelte renders using the same data, explicit domains, explicit breaks, explicit colors, 720×480 logical viewport, and 1440×960 output. R uses Cairo at 192 dpi. ggsvelte uses Chromium at device scale factor 2 with its bundled Roboto Condensed faces loaded and verified through `document.fonts.check()`.

Open [index.html](./index.html) for all 33 registered ggsvelte themes and the three side-by-side structural references. Raw structural measurements are in [r-metrics.json](./r-metrics.json) and [ggsvelte-metrics.json](./ggsvelte-metrics.json).

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
- ggthemes colorblind: `#000000 #E69F00 #56B4E9 #009E73 #F0E442 #0072B2 #D55E00 #CC79A7`
- ggthemes stata (s2color): `#1a476f #90353b #55752f #e37e00 #6e8e84 #c10534 #938dd2 #cac27e #a0522d #7b92a8 #2d6d66 #9c8847 #bfa19c #ffd200 #d9e6eb`
- ggthemes stata_s1color: `#006000 #ff4500 #1a476f #90353b #6e8e84 #a0522d #ff7f00 #ff00ff #00ffff #ff0000 #00ff00 #9c8847 #800080 #c0dcc0 #add8e6`
- ggthemes stata_s1rcolor: `#ffff00 #00ff00 #0080ff #ff00ff #ff7f00 #ff0000 #add8e6 #ffe474 #00ff80 #c0dcc0 #ff4500 #0000ff #ff0080 #6e8e84 #a0522d`
- ggthemes stata_mono: `#606060 #a0a0a0 #808080 #404040 #000000 #e0e0e0 #202020 #707070 #909090 #b0b0b0 #d0d0d0 #f0f0f0 #303030 #c0c0c0 #505050`
- ggthemes solarized: `#268bd2 #b58900 #cb4b16 #dc322f #d33682 #6c71c4 #2aa198 #859900`
- ggthemes tableau20 (Tableau 20): `#4E79A7 #A0CBE8 #F28E2B #FFBE7D #59A14F #8CD17D #B6992D #F1CE63 #499894 #86BCB6 #E15759 #FF9D9A #79706E #BAB0AC #D37295 #FABFD2 #B07AA1 #D4A6C8 #9D7660 #D7B5A6`
- ggthemes tableau_colorblind (Tableau Color Blind): `#1170aa #fc7d0b #a3acb9 #57606c #5fa2ce #c85200 #7b848f #a3cce9 #ffbc79 #c8d0d9`
- ggthemes tableau_seattle_grays (Seattle Grays): `#767f8b #b3b7b8 #5c6068 #d3d3d3 #989ca3`
- ggthemes tableau_jewel_bright (Jewel Bright): `#eb1e2c #fd6f30 #f9a729 #f9d23c #5fbb68 #64cdcc #91dcea #a4a4d5 #bbc9e5`
- ggthemes tableau_green_orange_teal (Green-Orange-Teal): `#4e9f50 #87d180 #ef8a0c #fcc66d #3ca8bc #98d9e4 #94a323 #c3ce3d #a08400 #f7d42a #26897e #8dbfa8`
- ggthemes tableau_red_blue_brown (Red-Blue-Brown): `#466f9d #91b3d7 #ed444a #feb5a2 #9d7660 #d7b5a6 #3896c4 #a0d4ee #ba7e45 #39b87f #c8133b #ea8783`
- ggthemes tableau_purple_pink_gray (Purple-Pink-Gray): `#8074a8 #c6c1f0 #c46487 #ffbed1 #9c9290 #c5bfbe #9b93c9 #ddb5d5 #7c7270 #f498b6 #b173a0 #c799bc`
- ggthemes tableau_hue_circle (Hue Circle): `#1ba3c6 #2cb5c0 #30bcad #21B087 #33a65c #57a337 #a2b627 #d5bb21 #f8b620 #f89217 #f06719 #e03426 #f64971 #fc719e #eb73b3 #ce69be #a26dc2 #7873c0 #4f7cba`
- ggthemes few (Medium): `#5DA5DA #FAA43A #60BD68 #F17CB0 #B2912F #B276B2 #DECF3F #F15854`
- ggthemes few_light (Light): `#88BDE6 #FBB258 #90CD97 #F6AAC9 #BFA554 #BC99C7 #EDDD46 #F07E6E`
- ggthemes few_dark (Dark): `#265DAB #DF5C24 #059748 #E5126F #9D722A #7B3A96 #C7B42E #CB2027`
- ggthemes fivethirtyeight: `#008FD5 #FF2700 #77AB43`
- ggthemes ptol (full capacity): `#332288 #6699CC #88CCEE #44AA99 #117733 #999933 #DDCC77 #661100 #CC6677 #AA4466 #882255 #AA4499`
- ggthemes calc: `#004586 #ff420e #ffd320 #579d1c #7e0021 #83caff #314004 #aecf00 #4b1f6f #ff950e #c5000b #0084d1`
- ggthemes excel (line): `#FF00FF #FFFF00 #00FFFF #800080 #800000 #008080 #0000FF`
- ggthemes excel_fill (area): `#993366 #FFFFCC #CCFFFF #660066 #FF8080 #0066CC #CCCCFF`
- ggthemes excel_new (Office Theme): `#4472C4 #ED7D31 #A5A5A5 #FFC000 #5B9BD5 #70AD47`
- ggthemes canva (Fresh and bright): `#f98866 #ff420e #80bd9e #89da59`
- ggthemes wsj (colors6): `#c72e29 #016392 #be9c2e #098154 #fb832d #000000`
- ggthemes wsj_rgby: `#d3ba68 #d5695d #5d8ca8 #65a479`
- ggthemes wsj_red_green: `#088158 #ba2f2a`
- ggthemes wsj_black_green: `#000000 #595959 #59a77f #008856`
- ggthemes wsj_dem_rep: `#006a8e #b1283a #a8a6a7`

## Sources

- ggplot2 defaults: `/Users/liamodea/Code/ggplot2/R/theme-defaults.R`
- hrbrthemes Roboto Condensed: `/Users/liamodea/Code/hrbrthemes/R/roboto-condensed.r`
- hrbrthemes palettes: `/Users/liamodea/Code/hrbrthemes/R/color.r` and `R/flexoki.R`
- ggthemes Few: `/Users/liamodea/Code/ggthemes/R/few.R`
- ggthemes WSJ theme: `/Users/liamodea/Code/ggthemes/R/wsj.R`
- ggthemes Solarized themes: `/Users/liamodea/Code/ggthemes/R/solarized.R`
- ggthemes palettes: `/Users/liamodea/Code/ggthemes/data-raw/theme-data/tableau.yml`, `colorblind.yml`, and `stata.yml`, `solarized.yml`, `few.yml`, `fivethirtyeight.yml`, `wsj.yml`, and `pault.yml`; canva palette from `/Users/liamodea/Code/ggthemes/data/canva_palettes.rda`

Reproduce everything with:

```sh
bun run render:theme-evidence
```
