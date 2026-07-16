window.BENCHMARK_DATA = {
  "lastUpdate": 1784210058361,
  "repoUrl": "https://github.com/ljodea/ggsvelte",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "committer": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "distinct": true,
          "id": "38c93ab827da0ed46130fd156cec6eb636a8a743",
          "message": "fix(ci): bash shell in container jobs; suppress actionlint vars false positive\n\nPlaywright container's /bin/sh is dash and rejects 'set -o pipefail' —\ncontainer jobs now default to bash. The npm actionlint wasm build\n(2.0.6) predates the 'vars' context; suppress that single false\npositive with a documented removal condition. gh-pages bootstrapped\nfor benchmark trend data.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-11T19:44:29-05:00",
          "tree_id": "c2c1a1773a1d41d9c2177b0e55787e7e167382f2",
          "url": "https://github.com/ljodea/ggsvelte/commit/38c93ab827da0ed46130fd156cec6eb636a8a743"
        },
        "date": 1783817117136,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.0543,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1958,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.7398,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.8279,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 88.6075,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 126.5782,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.076,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.5994,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.9285,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.0472,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 17.3808,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 16.747,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 123.9948,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6631,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 30.4952,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.6506,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 643.5191,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 164.3306,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "committer": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "distinct": true,
          "id": "fb223b04d5b3522bc45ed78ecb70dd8b01625e16",
          "message": "fix(spikes): regenerate font-metrics table inside the pinned Playwright container\n\nThe spike measure-drift suite's staleness guard compares the checked-in\nmetrics table against a fresh canvas measurement in the environment the\nsuite runs in. The committed table was generated on macOS Chromium\n(Helvetica), but CI runs the suite only inside\nmcr.microsoft.com/playwright:v1.61.1-noble, where Arial resolves to\nLiberation Sans: ascent/descent differ (91/21 vs 92/23) and four glyph\nadvances differ (macron, middle dot, thin space, euro), so the guard\n(0.05px tolerance) and the corpus drift gate (euro-driven 2.63px >\n2.0px) fail deterministically in the container. CI had never reached\nthis step before because the component step ahead of it failed first.\n\nPer decision 0003 the production/CI table must be generated inside the\npinned container — this is that table, captured from the suite's own\n\"generates the metrics table\" output in the container. Running the\nspike suite on a bare macOS host will now report staleness; that is\nexpected and documented in the file header.\n\nVerified in-container: spikes/browser 41/41 green.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-11T20:21:38-05:00",
          "tree_id": "2bc1c8bcba01081f67d5e5627931a66e6b4f61e0",
          "url": "https://github.com/ljodea/ggsvelte/commit/fb223b04d5b3522bc45ed78ecb70dd8b01625e16"
        },
        "date": 1783819358179,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8451,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2825,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.3355,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.7438,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 97.3627,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 129.994,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.124,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3893,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.5936,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.6328,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 17.6349,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 16.4152,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 123.9639,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6637,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.2521,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.2511,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 629.167,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.9637,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "committer": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "distinct": true,
          "id": "b45db26d994e6ff6c8950bd8ba662e9651f18dae",
          "message": "chore: add mise.toml and upgrade bun, TypeScript, Vite toolchain\n\nPin bun 1.3.14 via mise and packageManager, bump CI to match, and\nupgrade TypeScript 6, Vite 8, and @sveltejs/vite-plugin-svelte 7 across\nthe monorepo.",
          "timestamp": "2026-07-12T13:00:17-05:00",
          "tree_id": "ac1363866193ee51ea5f9e447c31424794a5e21b",
          "url": "https://github.com/ljodea/ggsvelte/commit/b45db26d994e6ff6c8950bd8ba662e9651f18dae"
        },
        "date": 1783879255439,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.2839,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.7411,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.26,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.6056,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 95.2095,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 131.5579,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9222,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1364,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 99.2436,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 120.8529,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.2333,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 10.7835,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 126.9352,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6472,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.8743,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 32.9356,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 614.1995,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 145.9125,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "committer": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "distinct": true,
          "id": "d0421a9963cf207a288966d592d548f65fbb6346",
          "message": "chore: add markdownlint-cli2 to pre-commit\n\nInstall markdownlint-cli2 as a lockfile devDependency and run it as a\nlocal pre-commit hook on staged .md files (same bun-binary pattern as\noxfmt/prettier/oxlint). Shared config relaxes MD013/MD029 for prose and\ndecision notes; tag a few unlabeled fences so the tree is green.",
          "timestamp": "2026-07-12T13:03:56-05:00",
          "tree_id": "33827c16d315991d456c30e8255ed7e501147be4",
          "url": "https://github.com/ljodea/ggsvelte/commit/d0421a9963cf207a288966d592d548f65fbb6346"
        },
        "date": 1783879472445,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6077,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.7996,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.9916,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.1636,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 97.9524,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 135.0732,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0104,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2593,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 101.8099,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 125.2925,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.9529,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 10.9676,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 132.6302,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6899,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.1953,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 33.7209,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 627.7068,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 151.9164,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "committer": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "distinct": true,
          "id": "32c97793ac0df56b1157521b7daf88e914019ffc",
          "message": "fix: satisfy release tooling for render scripts",
          "timestamp": "2026-07-13T21:32:25-05:00",
          "tree_id": "f9a4714c911be480cf389f55b54dbb5c83a72376",
          "url": "https://github.com/ljodea/ggsvelte/commit/32c97793ac0df56b1157521b7daf88e914019ffc"
        },
        "date": 1783996450074,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.7505,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.7421,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.7479,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.8562,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 80.7129,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 114.8971,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9804,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1499,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 83.7293,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 104.427,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.1461,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.7268,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.2583,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6631,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.8913,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.0163,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 614.5828,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 157.9082,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "committer": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "distinct": true,
          "id": "304ea1f860f003e2e5ee6e3da61fd1d18415bdaa",
          "message": "fix: deploy docs to GitHub Pages",
          "timestamp": "2026-07-13T21:46:00-05:00",
          "tree_id": "1148292b3b55b3ac2781a598a81140f2575a8176",
          "url": "https://github.com/ljodea/ggsvelte/commit/304ea1f860f003e2e5ee6e3da61fd1d18415bdaa"
        },
        "date": 1783997275959,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3467,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.6302,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.6716,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.1181,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 95.2092,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 135.5605,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9631,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1542,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 96.305,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 122.3243,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.7271,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.2164,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 131.7907,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 1.2557,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.4242,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 31.6193,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 674.1254,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.3573,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "committer": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "distinct": true,
          "id": "b36108c1dbdb05fe053ea1500db8a7f2d36d6ac6",
          "message": "fix: package Svelte before Pages build",
          "timestamp": "2026-07-13T21:48:16-05:00",
          "tree_id": "1f14d9131124d0d8696f9a4896bf607ef2aea034",
          "url": "https://github.com/ljodea/ggsvelte/commit/b36108c1dbdb05fe053ea1500db8a7f2d36d6ac6"
        },
        "date": 1783997443185,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 1.7223,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.1527,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 7.6014,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 10.8427,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 64.3178,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 93.2288,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.7838,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 0.8985,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 65.1455,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 84.2721,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 9.3706,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 9.0075,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 93.7583,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.5073,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 20.2867,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 21.9914,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 505.1755,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 127.5427,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "10811ed841b9779fb4e5d1d0092451729cb11ff9",
          "message": "feat: add trustworthy interactive plots (#11)\n\n* feat(core): add semantic interaction foundations\n\n* feat(svelte): implement accessible plot interactions\n\n* docs: ship interaction journeys and release gates\n\n* fix(ci): stabilize container interaction gates\n\n* test: allow dense axe audit on Firefox\n\n* fix(ci): build package before docs target\n\n* fix(ci): use bash for visual approval packaging\n\n* fix(ci): permit audited visual baseline branches\n\n* test: isolate visual guard repositories\n\n* test: mock git for visual guard isolation",
          "timestamp": "2026-07-14T22:45:05-05:00",
          "tree_id": "80310d877842577a8f33b80b5887f759ca78b654",
          "url": "https://github.com/ljodea/ggsvelte/commit/10811ed841b9779fb4e5d1d0092451729cb11ff9"
        },
        "date": 1784087141738,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6954,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1936,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.8641,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.0408,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 87.4225,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 124.4233,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9282,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2232,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 89.1693,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 116.3322,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.8598,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.1078,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 122.8731,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6575,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.2668,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.7049,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.1311,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 629.7997,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 168.4027,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1e2376e9f8671e73fb9c03bbc3a1a4200019d821",
          "message": "test: approve interaction visual baselines for #11 (#12)\n\n* feat(core): add semantic interaction foundations\n\n* feat(svelte): implement accessible plot interactions\n\n* docs: ship interaction journeys and release gates\n\n* fix(ci): stabilize container interaction gates\n\n* test: allow dense axe audit on Firefox\n\n* fix(ci): build package before docs target\n\n* fix(ci): use bash for visual approval packaging\n\n* vr: update baselines for PR #11 @ 20da042ecdf3b8870f69dc15587cbe953ddf2256\n\n* fix(ci): permit audited visual baseline branches\n\n* test: isolate visual guard repositories\n\n* test: mock git for visual guard isolation",
          "timestamp": "2026-07-14T22:53:51-05:00",
          "tree_id": "3fdb299e4a7674c1af2aa47796039ba3796fa70e",
          "url": "https://github.com/ljodea/ggsvelte/commit/1e2376e9f8671e73fb9c03bbc3a1a4200019d821"
        },
        "date": 1784087672005,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5979,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0303,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.4126,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.9594,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 87.323,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 125.1796,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.2074,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2114,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.423,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.7295,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.4006,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.6305,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.4066,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6624,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.4383,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3636,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.6608,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 584.9174,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.0835,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "committer": {
            "email": "liam.j.odea@gmail.com",
            "name": "ljodea",
            "username": "ljodea"
          },
          "distinct": true,
          "id": "1f29149219f351c605a02736a5cd17364c4e53b5",
          "message": "chore: ignore local gstack artifacts",
          "timestamp": "2026-07-14T22:55:29-05:00",
          "tree_id": "8cd34460b63ea8befa69275a4d137ca73e9355b6",
          "url": "https://github.com/ljodea/ggsvelte/commit/1f29149219f351c605a02736a5cd17364c4e53b5"
        },
        "date": 1784087823654,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 1.8499,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.204,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 7.9415,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 11.0433,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 65.3791,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 96.6423,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0648,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 0.9368,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 66.8822,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 85.3792,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 9.1048,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 8.8557,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 90.415,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.5053,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 21.8291,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.672,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 22.6554,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 481.3189,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 129.3458,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "25a89113910de244b21098bcae4ded4d559b938c",
          "message": "ci: verify packed consumer compatibility (#13)\n\n* ci: verify packed consumer compatibility\n\n* fix: expose locked pnpm to consumer harness\n\n* fix: invoke pinned pnpm CLI directly\n\n* fix: keep browser traces without stream snapshots\n\n* fix: trace only retried browser failures",
          "timestamp": "2026-07-15T01:28:15-05:00",
          "tree_id": "7982be0b55665df743fda621b566e613f64781c0",
          "url": "https://github.com/ljodea/ggsvelte/commit/25a89113910de244b21098bcae4ded4d559b938c"
        },
        "date": 1784096931197,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5367,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.289,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.4154,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.3832,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.378,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.9128,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0409,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2599,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.3742,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.9889,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.6219,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.2197,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.3125,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6636,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.6417,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5188,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.0037,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 592.6942,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.1657,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c01b660980aa4e44f05026b609397e7653e352ec",
          "message": "feat(docs): add safe interactive playground (#14)\n\nRefs #5",
          "timestamp": "2026-07-15T02:07:51-05:00",
          "tree_id": "625a8d745b9b5d2dc3ba8385221123ea66ae79e1",
          "url": "https://github.com/ljodea/ggsvelte/commit/c01b660980aa4e44f05026b609397e7653e352ec"
        },
        "date": 1784099314672,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.5344,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1386,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 15.5091,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.2411,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.0752,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.3141,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9567,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2085,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 83.5316,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.7874,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.852,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.8609,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.465,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.664,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.6918,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.334,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.7042,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 599.5097,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.6644,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1c9e9e823fb4d640d85738c8fe2b3cc3ba9dc7f3",
          "message": "chore: add structured community feedback forms (#15)\n\nCloses #8",
          "timestamp": "2026-07-15T02:20:10-05:00",
          "tree_id": "179520480a42e873c2125fd021f63835163e1fcb",
          "url": "https://github.com/ljodea/ggsvelte/commit/1c9e9e823fb4d640d85738c8fe2b3cc3ba9dc7f3"
        },
        "date": 1784100043280,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3296,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9124,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.0181,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.6565,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.2114,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.4945,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9346,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1802,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 91.2127,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.3563,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.6794,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.2372,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.8586,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6568,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.8133,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4194,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.3541,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 611.4236,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.5354,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "daa7e2f8bc50da574dabac2b8a32f7978049d426",
          "message": "test(vr): approve interaction baselines for PR #19\n\nBaselines generated and verified by the protected /approve-visuals workflow. The standalone VR mismatch is expected until source PR #19 lands.",
          "timestamp": "2026-07-15T03:06:30-05:00",
          "tree_id": "50f5b5b850dbfc00507d69845710d494786e6c0b",
          "url": "https://github.com/ljodea/ggsvelte/commit/daa7e2f8bc50da574dabac2b8a32f7978049d426"
        },
        "date": 1784102826886,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.5675,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1489,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 12.884,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.0605,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 102.0948,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 144.72,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0417,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3316,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 98.4905,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 125.1796,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.677,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.3605,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 127.646,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.663,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.8271,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 6.8406,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 36.3168,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 655.5592,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 155.9784,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "be438bb2ac246aa7c861b59f208c5626f3aae7d9",
          "message": "fix(a11y): establish the v0.1 manual AT release gate\n\nAdds release-ready interaction announcements, an atomic manual AT evidence schema, and real NVDA, VoiceOver, and TalkBack evidence harnesses.",
          "timestamp": "2026-07-15T03:10:19-05:00",
          "tree_id": "ab18f08ae2a1efebf9ffc813ba550a49d6f5fa53",
          "url": "https://github.com/ljodea/ggsvelte/commit/be438bb2ac246aa7c861b59f208c5626f3aae7d9"
        },
        "date": 1784103062160,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.4153,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2873,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.5283,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.9866,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 102.7399,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 136.1506,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0562,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3146,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 101.5476,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 127.6952,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.7338,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.1515,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 134.2135,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6531,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.2263,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 6.2834,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 34.6871,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 659.2956,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 155.1074,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "27529c9fe8605db7130a223f2d0a772eadb9412a",
          "message": "fix(ci): repair manual AT evidence harness startup\n\nPins the verified setup-python action and serves the mobile fixture through the repository-aware docs server.",
          "timestamp": "2026-07-15T03:17:48-05:00",
          "tree_id": "72d3eeef2732de75f56444a03da01077d7143d48",
          "url": "https://github.com/ljodea/ggsvelte/commit/27529c9fe8605db7130a223f2d0a772eadb9412a"
        },
        "date": 1784103507611,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.7948,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0572,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.7895,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.0356,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 86.8242,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.1759,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9441,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2244,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.2316,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.637,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.4295,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.5766,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.2572,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6337,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.4309,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.6042,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.616,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 603.3309,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.8038,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1004a8cd8880d0891b899cd31de33d6b43894fb5",
          "message": "fix(ci): include NVDA harness workspaces\n\nChecks out the pinned NVDA submodules so the official Robot harness can resolve its workspace dependencies.",
          "timestamp": "2026-07-15T03:26:18-05:00",
          "tree_id": "73b3613447bb2f2ec950904047aca3b9239eadb5",
          "url": "https://github.com/ljodea/ggsvelte/commit/1004a8cd8880d0891b899cd31de33d6b43894fb5"
        },
        "date": 1784104017104,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6627,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9551,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.2277,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 17.1045,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 100.7094,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 146.0233,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1205,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3782,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 101.5658,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 126.0417,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.2394,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.6863,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 131.2335,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6335,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.7221,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 6.6169,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 35.99,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 654.506,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 157.9667,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c586413d3ba784f56b45639cac9bee1bb340ba84",
          "message": "fix(ci): use portable filters in TalkBack harness\n\nKeeps the same real TalkBack assertions while using grep available on hosted Ubuntu.",
          "timestamp": "2026-07-15T03:30:58-05:00",
          "tree_id": "cfc7f94225c456c98e65bd445323b10089addcca",
          "url": "https://github.com/ljodea/ggsvelte/commit/c586413d3ba784f56b45639cac9bee1bb340ba84"
        },
        "date": 1784104298750,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8635,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9538,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.9398,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.7403,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.5387,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.9077,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9676,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2558,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.4599,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.6253,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.5883,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.5007,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.203,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.632,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.4664,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.324,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.3118,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 595.2194,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.6957,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "72a9b425638a3ebb877adcbebf8108ed2d46f7bd",
          "message": "fix(ci): keep NVDA fixture alive during evidence\n\nRuns the release-shaped fixture in the same PowerShell lifetime as the real NVDA Robot journey.",
          "timestamp": "2026-07-15T03:37:12-05:00",
          "tree_id": "f639ca78e3434efcd319b01ab8c58f8d133b11db",
          "url": "https://github.com/ljodea/ggsvelte/commit/72a9b425638a3ebb877adcbebf8108ed2d46f7bd"
        },
        "date": 1784104672518,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.1507,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.8857,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 12.8214,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.6708,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 89.1682,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.873,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.2094,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2457,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.1946,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.6282,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.5844,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.683,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.8718,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6629,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 25.1768,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5546,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.0899,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 597.3228,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.6112,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ec389853237033a2a80e96b336b4849d19c280c6",
          "message": "fix(ci): grant touch exploration before TalkBack bind\n\nOrders Android accessibility grants before binding the real TalkBack service.",
          "timestamp": "2026-07-15T03:44:30-05:00",
          "tree_id": "8470b67713fed73bb5cc047dc4e158a490cafe54",
          "url": "https://github.com/ljodea/ggsvelte/commit/ec389853237033a2a80e96b336b4849d19c280c6"
        },
        "date": 1784105103417,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6501,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.1087,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.2415,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.8391,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.6725,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.4785,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9799,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.214,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.158,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.5302,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.6524,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.7713,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.5675,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.64,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.5197,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3998,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.3356,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 600.5299,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.8054,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "964637915f47aa422d2b05ed535ad8823987c738",
          "message": "fix(ci): correct Win32 SendInput ABI\n\nDefines the complete 64-bit Win32 INPUT union so real keyboard events reach the headed browser.",
          "timestamp": "2026-07-15T03:49:40-05:00",
          "tree_id": "47397753216f75fdac4686574f92d3cf32a35de6",
          "url": "https://github.com/ljodea/ggsvelte/commit/964637915f47aa422d2b05ed535ad8823987c738"
        },
        "date": 1784105413705,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4203,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1575,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.1945,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.882,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.3539,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.3971,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9673,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2256,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.0811,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.2141,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.7258,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.6368,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.1862,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6658,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.922,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5493,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.562,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 590.9468,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.7106,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5e9ae99de94d53e63d258002e16f3703ff765b76",
          "message": "fix(ci): verify TalkBack state atomically\n\nRetries Android accessibility activation and accepts readiness only when TalkBack and touch exploration are simultaneously verified.",
          "timestamp": "2026-07-15T03:57:09-05:00",
          "tree_id": "5e2b7b2b78d9edab52ecd400e75c1832bca491f2",
          "url": "https://github.com/ljodea/ggsvelte/commit/5e9ae99de94d53e63d258002e16f3703ff765b76"
        },
        "date": 1784105862222,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4059,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8652,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.5843,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.6913,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.9651,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.6899,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.982,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2337,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.6839,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 115.449,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.6514,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.2479,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.5404,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6622,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.0734,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4342,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 32.2386,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 589.545,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.085,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e14202f8c28940b3a5ab8c05036e1c4e0c665427",
          "message": "fix(ci): establish clean NVDA speech boundaries\n\nSilences startup narration through NVDA public input before capturing the intended action.",
          "timestamp": "2026-07-15T03:59:24-05:00",
          "tree_id": "0566f6ef2d7cba845fb6be3ed0aeed32b385fe43",
          "url": "https://github.com/ljodea/ggsvelte/commit/e14202f8c28940b3a5ab8c05036e1c4e0c665427"
        },
        "date": 1784106000916,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.5689,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.7694,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 13.2271,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.6361,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 91.8952,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 138.1911,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0763,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3158,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 98.2524,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 120.7859,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 17.3497,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 14.6032,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 126.2825,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7184,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 29.867,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5124,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 32.7142,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 663.2278,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 168.1794,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c9a05d3fbac290b974213c4e080a49d7477bda46",
          "message": "fix(ci): prevent fixture server stealing AT focus (#30)",
          "timestamp": "2026-07-15T04:10:49-05:00",
          "tree_id": "1129ce05b3aefce813565168b613380562a3b1fa",
          "url": "https://github.com/ljodea/ggsvelte/commit/c9a05d3fbac290b974213c4e080a49d7477bda46"
        },
        "date": 1784106690711,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.714,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1868,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.6421,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.2217,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 87.4925,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.2659,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0111,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2727,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.0794,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.3937,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.2418,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 14.0459,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.6176,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6624,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.912,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4145,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.6323,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 597.1562,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.0906,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "136611459fbbf26c74cf3fe0680f40e4f289d4fb",
          "message": "fix(ci): dismiss Chrome onboarding before TalkBack (#31)",
          "timestamp": "2026-07-15T04:16:44-05:00",
          "tree_id": "ddb9c2377dc8950b16b1eb527b68f412e838f0e0",
          "url": "https://github.com/ljodea/ggsvelte/commit/136611459fbbf26c74cf3fe0680f40e4f289d4fb"
        },
        "date": 1784107034816,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.0963,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.2448,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 8.867,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 9.9753,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 66.2828,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 95.03,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.7376,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 0.92,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 67.1781,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 87.6002,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 8.9499,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 8.9168,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 95.2892,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.5059,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 22.6046,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.7994,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.0164,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 484.4879,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 131.0707,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6e014b16da0858180e480d91f8e33e48bd985564",
          "message": "fix(ci): reclaim headed browser focus for NVDA (#32)\n\n* fix(ci): reclaim headed browser focus for NVDA\n\n* chore: ignore Python bytecode caches",
          "timestamp": "2026-07-15T04:25:23-05:00",
          "tree_id": "9793f2e39d0e6f359c2e5e9698c79ba536830606",
          "url": "https://github.com/ljodea/ggsvelte/commit/6e014b16da0858180e480d91f8e33e48bd985564"
        },
        "date": 1784107561970,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4391,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8268,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.0439,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.022,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.5773,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 123.7542,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0196,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2182,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 89.3702,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 112.1044,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.4001,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.4483,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.8913,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6655,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.5194,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3848,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 33.0292,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 581.1576,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.2549,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8a3cc927a529adeb5998be09fec00aacd277ad0d",
          "message": "fix(ci): use TalkBack touch exploration taps (#33)",
          "timestamp": "2026-07-15T04:34:39-05:00",
          "tree_id": "56c91b32a7472288735f85c9b07ddedd308996f3",
          "url": "https://github.com/ljodea/ggsvelte/commit/8a3cc927a529adeb5998be09fec00aacd277ad0d"
        },
        "date": 1784108112860,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8035,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.3056,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.5643,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.6524,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.2225,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.669,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9293,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.6657,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.0517,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.0822,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.5446,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.302,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.6062,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6582,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.3962,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5341,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.4293,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 623.0155,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 163.4188,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7f95673c2c72ddfd10329acc3195f62ef8ecea87",
          "message": "fix(ci): hide hosted console during NVDA runs (#34)",
          "timestamp": "2026-07-15T04:40:24-05:00",
          "tree_id": "00bd0edd9becd94637af84ae5b62a0ecbd69bac6",
          "url": "https://github.com/ljodea/ggsvelte/commit/7f95673c2c72ddfd10329acc3195f62ef8ecea87"
        },
        "date": 1784108464916,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.6214,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.4174,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.9421,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 17.8343,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 88.229,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.4744,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.4325,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2411,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.6262,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.9762,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.7432,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.3971,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 119.1292,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6724,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.95,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.593,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.4986,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 606.4771,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.3372,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "bda81b74f92fd855c9c44306cd3f18e5dcbcfc98",
          "message": "docs: record v0.1.0 manual AT release gate (#35)",
          "timestamp": "2026-07-15T04:49:09-05:00",
          "tree_id": "ce726f102995dcbaeefb4588a82069bca445cfe4",
          "url": "https://github.com/ljodea/ggsvelte/commit/bda81b74f92fd855c9c44306cd3f18e5dcbcfc98"
        },
        "date": 1784108984056,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.7935,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2129,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.2428,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.6193,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.7672,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.7785,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9858,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3237,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.7658,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.301,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.2735,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.8982,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 120.463,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6566,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 29.7271,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.6402,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.8097,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 625.6367,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.765,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c7aecaacaa53efc01ef50cffb27ed6a9fc91671a",
          "message": "release: prepare linked v0.1.0 packages (#36)",
          "timestamp": "2026-07-15T04:55:49-05:00",
          "tree_id": "1e06437a2b09a7033cd9aa0194a6db7d65bf538c",
          "url": "https://github.com/ljodea/ggsvelte/commit/c7aecaacaa53efc01ef50cffb27ed6a9fc91671a"
        },
        "date": 1784109385497,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3913,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8998,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.7131,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.3533,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 91.4026,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.546,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9478,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1984,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.2641,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 113.4549,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.2783,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.0188,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 124.1234,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 1.2799,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 31.6021,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4165,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 32.6779,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 628.1461,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.705,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7476402895069f4d173c783ca81fce9676e3c144",
          "message": "fix: canonicalize published CLI bin path (#38)",
          "timestamp": "2026-07-15T08:34:43-05:00",
          "tree_id": "6aa8265bfc46a113040300487a19c31f44b4b3da",
          "url": "https://github.com/ljodea/ggsvelte/commit/7476402895069f4d173c783ca81fce9676e3c144"
        },
        "date": 1784122521174,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.421,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.6266,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.4221,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.8165,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 125.5076,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1533,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2254,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 89.9025,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 112.8798,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.3672,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.5155,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 120.9837,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.664,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.229,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3735,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.0461,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 584.6221,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.7687,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "57764a782b4283511481b3b7bc990779bad6e35f",
          "message": "fix: publish Svelte adapter under project scope (#39)",
          "timestamp": "2026-07-15T11:21:02-05:00",
          "tree_id": "952c4a26cafef06b44b3f51e198f9939dd12c081",
          "url": "https://github.com/ljodea/ggsvelte/commit/57764a782b4283511481b3b7bc990779bad6e35f"
        },
        "date": 1784132506488,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4566,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.6999,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.3957,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.1035,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 102.8709,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 123.3627,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9841,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2084,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.6777,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.9897,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.387,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.4404,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.8581,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6631,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.6368,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.566,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.8751,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 588.62,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.2721,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "41898282+github-actions[bot]@users.noreply.github.com",
            "name": "github-actions[bot]",
            "username": "github-actions[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "df4d00417f0b5f424520f1b6e0a5bb8fff1cae3a",
          "message": "Version Packages (#37)\n\nCo-authored-by: github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-15T11:29:34-05:00",
          "tree_id": "cf4f9ac9a7c55dad34a783f0e3a8395be4e42782",
          "url": "https://github.com/ljodea/ggsvelte/commit/df4d00417f0b5f424520f1b6e0a5bb8fff1cae3a"
        },
        "date": 1784133022465,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4766,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0433,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.0392,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.1824,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.1255,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.0441,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.965,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.522,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.9511,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.2302,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.7324,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 14.2761,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.8313,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6635,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.8343,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4258,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 32.8812,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 595.1773,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.5664,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6b3b581927c5f9071839aa51f35c3a5a1e597e23",
          "message": "fix: publish installable internal dependencies (#40)",
          "timestamp": "2026-07-15T11:39:48-05:00",
          "tree_id": "4a04c4f3d7fcd64d80cc0e0f7945c9749d76b0a8",
          "url": "https://github.com/ljodea/ggsvelte/commit/6b3b581927c5f9071839aa51f35c3a5a1e597e23"
        },
        "date": 1784133618517,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 1.7341,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.0563,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 6.7106,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 9.8103,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 60.1989,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 93.1505,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.7429,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 0.9103,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 67.5649,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 85.1121,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 7.9991,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 7.4928,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 90.1935,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.4325,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 20.8117,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 4.6534,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 23.2612,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 623.4253,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 104.5582,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "41898282+github-actions[bot]@users.noreply.github.com",
            "name": "github-actions[bot]",
            "username": "github-actions[bot]"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "68f29f80b22b91d301378b4e6e17d2abd7b093ec",
          "message": "Version Packages (#41)\n\nCo-authored-by: github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>",
          "timestamp": "2026-07-15T11:44:47-05:00",
          "tree_id": "c558034c7780c916892124b6c7721be150e55609",
          "url": "https://github.com/ljodea/ggsvelte/commit/68f29f80b22b91d301378b4e6e17d2abd7b093ec"
        },
        "date": 1784133925057,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.899,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0683,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 13.2893,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.4968,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 94.9977,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 139.189,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.062,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.7955,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 102.3448,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 128.487,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.7833,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.6046,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 134.3102,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6442,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.6404,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 6.8695,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 33.567,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 664.5536,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 158.3646,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "45c5cf638b076b1fb938c697d92ce3fb0d644942",
          "message": "fix: allow audited manual AT evidence aliases (#42)\n\n* fix: allow audited manual AT evidence aliases\n\n* fix: lint generated changelog sections by release",
          "timestamp": "2026-07-15T15:00:43-05:00",
          "tree_id": "c12f69d8ef02e085d4dcb149e55703bcde48a154",
          "url": "https://github.com/ljodea/ggsvelte/commit/45c5cf638b076b1fb938c697d92ce3fb0d644942"
        },
        "date": 1784145681418,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5212,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.7968,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.8659,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 11.9639,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 79.8604,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.6637,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.999,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1987,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.8244,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.5457,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.2913,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.3574,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.0229,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6624,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.2952,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4664,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.532,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 587.1048,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.5807,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "eb83655e33e392e12bacdfc8854ca2649615889b",
          "message": "vr: update baselines for PR #43 @ fe6cd33bf26bd87bd3761a88b48a059c81634d3c (#44)\n\nCo-authored-by: ggsvelte-vr-bot <vr-bot@users.noreply.github.com>",
          "timestamp": "2026-07-15T15:31:49-05:00",
          "tree_id": "7bf8a92a591f971d8f39eb749de57af5d3fb6295",
          "url": "https://github.com/ljodea/ggsvelte/commit/eb83655e33e392e12bacdfc8854ca2649615889b"
        },
        "date": 1784147540847,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.1457,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.3186,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 7.7753,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 11.3552,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 65.914,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 91.784,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.7912,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 0.9332,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 66.1732,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 85.3344,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 10.0232,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 9.1271,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 90.6477,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.5081,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 22.4387,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.7244,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 23.1658,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 486.8241,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 129.2357,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1fc7b4d0847b5c9664806b4dd40c7db8e306a2fa",
          "message": "feat: add linked interaction controller (#43)\n\n* feat: add linked interaction controller\n\n* fix: account for multi-plot visual examples",
          "timestamp": "2026-07-15T15:37:27-05:00",
          "tree_id": "5e18f429d2aa33de2a0d8538b92db75f3bcf80a6",
          "url": "https://github.com/ljodea/ggsvelte/commit/1fc7b4d0847b5c9664806b4dd40c7db8e306a2fa"
        },
        "date": 1784147883243,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.7736,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.3108,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.2022,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.726,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.6599,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.9282,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0423,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.4392,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 95.3141,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.6648,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.2057,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.4055,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 119.7344,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6595,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.2232,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4367,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 31.5082,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 620.8541,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 168.0805,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ec0868b1e3b295fa58ceeb3d317b1bce768d99f4",
          "message": "refactor(svelte): split GGPlot helpers and presentational UI (#46)\n\n* refactor(svelte): split GGPlot helpers and presentational UI\n\nExtract pure geometry/labels/a11y helpers and ToolRail/InteractionOverlay\ncomponents so GGPlot stays a thinner orchestrator. Behavior and public API\nare unchanged; unit tests cover the extracted pure paths.\n\n* test(svelte): cover extracted tool rail and overlay layout\n\nAssert ToolRail narrow class/positioning and that InteractionOverlay stays\nan absolute, pointer-inert plot-root sibling before the capture surface.\n\n* ci: trigger checks for PR #46\n\n* style: apply repo formatter to extracted GGPlot modules\n\n* fix(svelte): clear type-aware lint on extracted GGPlot modules\n\nAvoid deprecated ZoomDomains, drop unnecessary non-null assertions, and\nmake live-text field filtering use explicit boolean control flow.",
          "timestamp": "2026-07-15T17:37:12-05:00",
          "tree_id": "cc26928be3801a0720f893a4544083c6b877f8db",
          "url": "https://github.com/ljodea/ggsvelte/commit/ec0868b1e3b295fa58ceeb3d317b1bce768d99f4"
        },
        "date": 1784155065831,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4952,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8455,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.0221,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.6395,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 89.9982,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 116.7276,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.009,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.5077,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.5767,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.8513,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.573,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.1246,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.3511,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6581,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.3964,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4706,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 32.546,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 620.3958,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.3719,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b89d96ba4a338491cc14ed4b29c61e7e857e56fe",
          "message": "refactor(svelte): extract pure GGPlot interaction helpers (#47)\n\n* refactor(svelte): extract pure GGPlot interaction helpers\n\nPull pointer navigation, zoom domain merge, selection algebra, interval\nquery expansion, and theme CSS token formatting out of GGPlot into focused\nmodules with characterization tests. GGPlot stays the orchestrator; public\nAPI and interaction semantics are unchanged.\n\n* fix(svelte): drop unnecessary type assertion in plot-zoom\n\nSatisfies oxlint typescript/no-unnecessary-type-assertion for CI\npre-commit type-aware parity.",
          "timestamp": "2026-07-15T18:01:47-05:00",
          "tree_id": "a2a2389764398982839c8d3c8b6f82252afd35e9",
          "url": "https://github.com/ljodea/ggsvelte/commit/b89d96ba4a338491cc14ed4b29c61e7e857e56fe"
        },
        "date": 1784156543836,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4554,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.5268,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 8.3006,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.5026,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 86.9387,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 127.7398,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.2494,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2198,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 93.0989,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 113.9588,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 9.8455,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 9.7431,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 123.6093,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6256,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 24.4844,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.902,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 34.2862,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 590.3116,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 137.0017,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1d0f63cfd279ebd452b118cee3f6894594c95660",
          "message": "refactor(svelte): extract interval selection and capability helpers (#48)\n\n* refactor(svelte): extract interval selection and capability helpers\n\nMove pointer brush-end gate, interval selection event freeze/clear,\ncandidate hit matching, semantic key collection helpers, and zoom\ncapability status copy out of GGPlot into pure modules with\ncharacterization tests. No public API change.\n\n* style: apply oxfmt to interval/capability helper extracts\n\n* fix: use CANDIDATE_HIT_TOLERANCE in tests for knip\n\nknip flagged the exported constant as unused; pin the exclusive\ntolerance contract via the public export in characterization tests.",
          "timestamp": "2026-07-15T18:28:38-05:00",
          "tree_id": "fb60bf883efe3bf7a3aa3931564b1d50e77a73ff",
          "url": "https://github.com/ljodea/ggsvelte/commit/1d0f63cfd279ebd452b118cee3f6894594c95660"
        },
        "date": 1784158152340,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4558,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.6156,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.2228,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.5026,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 94.2193,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 126.3018,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9472,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.7175,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 89.9245,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 112.8423,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 10.3978,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 10.0129,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.9413,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.617,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 24.2726,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.5849,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.7086,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 590.2791,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 133.1112,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b3a213d44009f4ae527df2d174914678b26579a9",
          "message": "refactor(svelte): extract plot assemble and semantic key helpers (#49)\n\n* refactor(svelte): extract plot assemble and semantic key helpers\n\nMove PortableSpec assembly, interaction-scope resolution, source-identity\ntracking, and semantic key diagnostics out of GGPlot into pure modules\nwith characterization tests. GGPlot remains the orchestrator; public API\nand interaction semantics are unchanged.\n\n* fix(svelte): short-circuit assembled spec before registry reads\n\nWhen an explicit spec is provided, avoid evaluating registry children and\nother ignored props as reactive dependencies of the assembled plot.",
          "timestamp": "2026-07-15T18:54:02-05:00",
          "tree_id": "0fbe7d9461a668f527722d5c02e422b4a82d8b67",
          "url": "https://github.com/ljodea/ggsvelte/commit/b3a213d44009f4ae527df2d174914678b26579a9"
        },
        "date": 1784159675486,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.423,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8228,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.9898,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.4647,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.3756,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.4734,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9393,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1866,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.1336,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.1689,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.4941,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.7153,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.1199,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6578,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.2061,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4358,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.1305,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 635.5279,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.7446,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "60d51e9d515514d53119ab0a3b7571a67ffe4dbf",
          "message": "refactor(svelte): extract GGPlot paint readiness and interaction pure seams (#51)\n\nMove canvas first-paint readiness, tool filtering, traversal hit building,\ninterval selection assembly, and clear-inspection fingerprint ownership out\nof GGPlot into focused pure modules with characterization tests. Fix paint\ntracking to count distinct strata (not raw notifications) and derive\ndata-gg-ready instead of effect-syncing it.\n\nPublic GGPlot API is unchanged.",
          "timestamp": "2026-07-15T19:23:18-05:00",
          "tree_id": "56d15896a80dcbd569a4eb0316b5a55ab6fefa4b",
          "url": "https://github.com/ljodea/ggsvelte/commit/60d51e9d515514d53119ab0a3b7571a67ffe4dbf"
        },
        "date": 1784161431775,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4466,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2713,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.6622,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.5997,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.7595,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.7951,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9557,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1935,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.8972,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 113.468,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.4793,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.2248,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.2618,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6558,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.6515,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3795,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 34.489,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 615.676,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.6469,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6b4e0fab33fb28988c3b81c4c64859d1102ff3e1",
          "message": "Merge pull request #52 from ljodea/vr-update/pr-50\n\nvr: update baselines for legend focus",
          "timestamp": "2026-07-15T19:27:40-05:00",
          "tree_id": "3c7bc73990bdf770129769011b6de16524c03bd9",
          "url": "https://github.com/ljodea/ggsvelte/commit/6b4e0fab33fb28988c3b81c4c64859d1102ff3e1"
        },
        "date": 1784161693772,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6645,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1701,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.4042,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.0529,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 89.2756,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.6555,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9528,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.8467,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 83.0022,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.395,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.2627,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.0268,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.2564,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6397,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 24.9619,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.9213,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.7899,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 588.0438,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.1553,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c006149255e837c101d733d2fc2384442b09c88b",
          "message": "Merge pull request #50 from ljodea/feat/legend-focus-r2\n\nfeat: add linked interactive legend focus",
          "timestamp": "2026-07-15T19:34:39-05:00",
          "tree_id": "795ef54da3827a00e06a2b4822a498904c47bbc3",
          "url": "https://github.com/ljodea/ggsvelte/commit/c006149255e837c101d733d2fc2384442b09c88b"
        },
        "date": 1784162112932,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.2672,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.8862,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.6031,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.4133,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.5389,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.4853,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9292,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.152,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 82.5859,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 105.3205,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.5546,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.1314,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 111.9819,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6588,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.0493,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4078,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 31.9375,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 610.2269,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.7532,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4cd27ca8fbbceb7e59bf3b383d2cb20a50b52321",
          "message": "refactor(svelte): extract interval brush geometry and scene query (#53)\n\nMove brush corner geometry (start/update/nudge/pointer-end evaluation) and\ninterval selection scene query (expand → lineage rows → domain invert) out of\nGGPlot into pure modules with characterization tests. Keep brushRect and the\nreducer area FSM in GGPlot so draft state has a single host owner.\n\nPublic GGPlot API is unchanged.",
          "timestamp": "2026-07-15T19:39:44-05:00",
          "tree_id": "293e36fe12d0b8b7b7d93087957b5d2a2cc74e7d",
          "url": "https://github.com/ljodea/ggsvelte/commit/4cd27ca8fbbceb7e59bf3b383d2cb20a50b52321"
        },
        "date": 1784162418116,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8981,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1248,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.5853,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.1227,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 86.4915,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.1091,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0725,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2415,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.7103,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.3065,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.8588,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.9252,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 119.6731,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6563,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.2564,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3926,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.6732,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 632.2815,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 165.2325,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "867e16695dafaeefa9733e7b79b1b896bfd6cc4f",
          "message": "refactor(svelte): extract pure legend-focus helpers from GGPlot (#55)\n\n* refactor(svelte): extract pure legend-focus helpers from GGPlot\n\nLift discrete legend key indexing, pressed-identity resolution, roving\nnavigation, and entry listing into plot-legend-focus.ts with unit tests.\nMove legend interaction types out of the static Legend renderer so GGPlot\nthins to host state and DOM handlers without changing public API.\n\n* fix(svelte): satisfy knip and type-aware lint for legend helpers\n\nDrop unused type exports and remove unnecessary non-null assertions in\nthe pure legend-focus unit tests so pre-push gates pass.\n\n* fix(svelte): drop unnecessary non-null assertions in legend tests\n\nSatisfy oxlint no-unnecessary-type-assertion on the InteractiveLegendEntry\nsmoke test so pre-push type-aware lint passes.",
          "timestamp": "2026-07-15T20:22:25-05:00",
          "tree_id": "41e81fbe418a0cd141b609f591f966b57fc066df",
          "url": "https://github.com/ljodea/ggsvelte/commit/867e16695dafaeefa9733e7b79b1b896bfd6cc4f"
        },
        "date": 1784164983340,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5389,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8134,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.2879,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.4464,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 88.5307,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 129.5642,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.334,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2926,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 92.9491,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.9207,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.9267,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.3234,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 119.1589,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6393,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.5298,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4001,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.7089,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 583.9399,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.4165,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "78d0199a16e4ecd4565b5f521d8ee459e0d97e17",
          "message": "fix: audit manual AT alias commit ranges for runtime edits (#54)\n\n* fix: audit manual AT alias commit ranges for runtime edits\n\nClose the post-merge Codex finding on #42: aliases declared\nruntimeBehaviorChanged:false without verifying releaseCommit against the\ninherited testedCommit. Resolve both commits, require ancestry, and reject\nsubstantive diffs under packages/svelte/src or packages/core/src. CI unit\njob now fetches full history so the gate can run.\n\n* fix: satisfy type-aware lint and knip for alias audit helpers\n\n* fix(ci): fetch full history for pre-commit parity job\n\nThe checks job also runs bun test via pre-push parity, so alias commit\naudits need the same fetch-depth:0 as the unit job.\n\n* fix: tighten manual AT alias audit against Codex P2s\n\n- bind releaseCommit to the claimed release via package.json version\n- treat binary runtime diffs as substantive\n- stop classifying CSS universal-selector lines as JSDoc noise",
          "timestamp": "2026-07-15T20:32:14-05:00",
          "tree_id": "d7a8b240201b4d17ef1c44b64c07c7c1a135f97c",
          "url": "https://github.com/ljodea/ggsvelte/commit/78d0199a16e4ecd4565b5f521d8ee459e0d97e17"
        },
        "date": 1784165568141,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.793,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0467,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.5891,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.9526,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 86.1647,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.3678,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9382,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2216,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.5343,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.0751,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.2223,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.8368,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.3636,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6575,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.4352,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5411,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 31.0464,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 620.2502,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.9303,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "045d32fcbe74d60a842c36e65e00941592145ca3",
          "message": "refactor(svelte): extract pure capture-surface keyboard decisions (#56)\n\n* refactor(svelte): extract pure capture-surface keyboard decisions\n\nMove GGPlot's onSurfaceKeyDown decision tree into plot-surface-keyboard\nwith unit coverage for action priority (area draft, pin vs point, Escape\nreturn-to-inspect). GGPlot keeps side effects only.\n\n* fix(svelte): drop unused surface-keyboard exports and redundant returns\n\nSatisfy knip and oxlint pre-push gates after the pure keyboard extract.",
          "timestamp": "2026-07-15T20:41:56-05:00",
          "tree_id": "2452afa43aa1c35626c9e180a0cc3b900fc710e4",
          "url": "https://github.com/ljodea/ggsvelte/commit/045d32fcbe74d60a842c36e65e00941592145ca3"
        },
        "date": 1784166150456,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.7788,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.3758,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.2729,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.8306,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.2415,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 129.2237,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0536,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3123,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.8025,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.559,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.609,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.8248,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.5846,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6333,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.6798,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4855,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.9096,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 599.9891,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.2626,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "06be9a97b3f0ceaa6497d1df86fc6ace476dbb24",
          "message": "vr: update baselines for PR #57 @ 67fcb2ac184cd9c97cad8a64827ebdd21bdb430a (#58)\n\nCo-authored-by: ggsvelte-vr-bot <vr-bot@users.noreply.github.com>",
          "timestamp": "2026-07-15T20:50:19-05:00",
          "tree_id": "5c8cb9110c42999e17ad6d51a1923c3f27ec3250",
          "url": "https://github.com/ljodea/ggsvelte/commit/06be9a97b3f0ceaa6497d1df86fc6ace476dbb24"
        },
        "date": 1784166653789,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.6779,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.82,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.7286,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.5116,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 87.779,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.7197,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1497,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.219,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.8423,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.5105,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.3515,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.4519,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.1417,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6335,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.6692,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3668,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.7771,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 604.3496,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.5705,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7ca6d0079dbbabf75556f6a085fb75388515bfd7",
          "message": "vr: re-sync baselines for PR #57 @ 26766bd\n\nCo-authored-by: ggsvelte-vr-bot <vr-bot@users.noreply.github.com>",
          "timestamp": "2026-07-15T21:02:20-05:00",
          "tree_id": "03e0cefaf5ef178dd53a80ff2897c099d0fb23f4",
          "url": "https://github.com/ljodea/ggsvelte/commit/7ca6d0079dbbabf75556f6a085fb75388515bfd7"
        },
        "date": 1784167373476,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4174,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9142,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.3173,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.1307,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.8612,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.5177,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9352,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.5113,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.8795,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 112.7741,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.3738,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.6835,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.7879,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.658,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.968,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3807,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.4645,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 614.7639,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.6559,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a06844d023023621b77b22bf8be21b0cdcbba18e",
          "message": "refactor(svelte): extract pure capture-surface pointer decisions (#59)\n\n* refactor(svelte): extract pure capture-surface pointer decisions\n\nMove GGPlot pointerdown/up/click routing into plot-surface-pointer with\nunit coverage for touch-inspect priority, draft/reducer divergence, and\nsuppress-vs-point-vs-pin click order. Also extract frozen point-selection\nand zoom event builders plus ordered key equality for local no-ops.\nGGPlot keeps host cleanup and side effects only.\n\n* fix(svelte): clear shadow and useless-return lint on pointer switches\n\nRename inspect config binding and use break instead of trailing returns\nso type-aware oxlint passes under --deny-warnings.",
          "timestamp": "2026-07-15T21:07:24-05:00",
          "tree_id": "d7d905ea231be77caf277e6afe81e08c9b6a238f",
          "url": "https://github.com/ljodea/ggsvelte/commit/a06844d023023621b77b22bf8be21b0cdcbba18e"
        },
        "date": 1784167683675,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4619,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9088,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.7689,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.8231,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 86.1255,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 127.013,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1216,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2261,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.4758,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.5677,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.2595,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.9392,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 120.9472,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.633,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.6313,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3539,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.6331,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 590.1217,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.4163,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "79850974c38511e5d260728ff4359973b5ce4e15",
          "message": "fix: readable dark-theme linked-views controls (#44) (#57)\n\n* fix: use docs --fg for interaction example chrome in dark theme\n\nLinked-views (and legend-focus) chrome used var(--text, #17202a), but the\ndocs theme defines --fg/--bg only. The undefined --text fell back to\nnear-black, locking unreadable controls into the dark linked-views\nbaseline from #44.\n\n* test(vr): wait for committed legend-focus status before screenshot\n\nThe committed-state case can still paint a transient \"previewed here\"\nstatus from the pointer path before the commit event settles. Waiting on\nthe committed status copy keeps the golden image deterministic.",
          "timestamp": "2026-07-15T21:14:22-05:00",
          "tree_id": "10623bc949f473a7b173c80a1379979ad9901cc3",
          "url": "https://github.com/ljodea/ggsvelte/commit/79850974c38511e5d260728ff4359973b5ce4e15"
        },
        "date": 1784168103878,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.0168,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.4341,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.7537,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.7784,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 86.5353,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.7774,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.978,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1943,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.9727,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.1064,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.0679,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.15,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.4201,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6627,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.4399,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4562,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 33.1539,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 594.3766,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.072,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "afe2d643cb1907bf93c05c2a2130b6f6fa29cba4",
          "message": "refactor(svelte): extract pure legend surface event decisions (#62)\n\n* refactor(svelte): extract pure legend surface event decisions\n\nMove legend keydown, pointerup, and click routing into plot-legend-surface\nso priority (roving vs commit vs clear; touch suppress vs detail source)\ncan be unit-tested without mounting GGPlot. Host keeps touch-index,\nsuppress flag, pointercancel, and commit/clear side effects.\n\n* test(svelte): assert legend suppress clears for next click\n\nAfter a touch commit and suppressed compatibility click, a subsequent\nreal click must still activate. Locks host cleanup of suppressLegendClick.\n\n* fix(svelte): drop unused LegendKeyAction export for knip\n\nAction discriminant is still expressed via LegendKeyResolution.action;\nonly the nested alias was unused as a public export.",
          "timestamp": "2026-07-15T21:33:50-05:00",
          "tree_id": "e35c1e2b01941bbfea2358def020cab6988caa3e",
          "url": "https://github.com/ljodea/ggsvelte/commit/afe2d643cb1907bf93c05c2a2130b6f6fa29cba4"
        },
        "date": 1784169264371,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6421,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1094,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 14.0584,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.5027,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 86.0688,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.3169,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9785,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2437,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.2145,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.7095,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.4231,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.0164,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.0502,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6629,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.5918,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.397,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 32.5744,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 586.8069,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.1086,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "6623b2e269d93486b5a599b63db65876cf24c1d5",
          "message": "fix: address post-merge Codex findings from #43 (#61)\n\nControlled linked plots no longer hard-fail faceted zoom on missing\ndomain scopes, render passive selection rings, gate Clear selection to\npoint-select publishers, filter shared zoom by plot mode, and keep zoom\ndomain identity stable across selection/emphasis revisions.",
          "timestamp": "2026-07-15T21:39:31-05:00",
          "tree_id": "2a1cfac419e7fb6aadc8eccd41c069e9153832dd",
          "url": "https://github.com/ljodea/ggsvelte/commit/6623b2e269d93486b5a599b63db65876cf24c1d5"
        },
        "date": 1784169610754,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.9807,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.1856,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.2463,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 17.0127,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 90.6844,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.8804,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0113,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.207,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.3078,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.8508,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.0584,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.905,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 121.5958,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6413,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.6866,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4351,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.2221,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 594.9323,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.4192,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b854deaf83ea4dc933bc9c0c3f75cce33a20ca2a",
          "message": "refactor(svelte): extract pure pointer-move surface decisions (#63)\n\n* refactor(svelte): extract pure pointer-move surface decisions\n\nMove capture-surface pointermove routing (touch-inspect drag cancel,\narea queue, inspect queue) and the sticky 4px threshold into\nplot-surface-pointer so GGPlot's handler is a thin host switch.\n\n* test(svelte): cover host cancel of queued touch-inspect on drag\n\nLock the GGPlot pointermove cleanup contract: after touch-inspect drag\ncrosses the move threshold, a previously queued hover inspect must not\nfire and pointerup must not pin. Also re-oxfmt the pure helper suite.\n\n* fix(svelte): drop useless returns at end of pointermove switch",
          "timestamp": "2026-07-15T22:05:56-05:00",
          "tree_id": "66465410c569667d0efba87a9cbf80b354d48ae3",
          "url": "https://github.com/ljodea/ggsvelte/commit/b854deaf83ea4dc933bc9c0c3f75cce33a20ca2a"
        },
        "date": 1784171195918,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6757,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8489,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.1555,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.4572,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 107.8044,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 146.4038,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1154,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.9671,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 104.4875,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 128.8834,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.5521,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.5793,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 134.5969,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6467,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.7731,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 6.7103,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 34.5414,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 665.2215,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 158.2876,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1b79138dfc21dab5b37db706ebc10a5e6cf6e082",
          "message": "refactor(svelte): extract pure queued-inspect frame decisions (#65)\n\n* refactor(svelte): extract pure queued-inspect frame decisions\n\nMove the rAF onPointerFrame inspect-queue routing (none / drop / stash /\napply) into plot-surface-inspection so the priority table is unit-tested\nand GGPlot only snapshots queues and applies side effects.\n\n* fix: satisfy knip and oxlint on inspection frame extract\n\nDrop unused exported InspectionHostState and replace a terminal\nuseless return with break so pre-push type-aware lint and knip pass.",
          "timestamp": "2026-07-15T22:31:45-05:00",
          "tree_id": "6b6095b246404158f97208c1d4545909db6ccccb",
          "url": "https://github.com/ljodea/ggsvelte/commit/1b79138dfc21dab5b37db706ebc10a5e6cf6e082"
        },
        "date": 1784172741608,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.1092,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.4209,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 7.4546,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 10.1173,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 66.5154,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 94.689,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.7533,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.0895,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 69.8247,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 84.9007,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 9.1574,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 10.3286,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 89.3104,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.5088,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 21.3431,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.681,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 22.1707,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 490.735,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 129.277,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3635fcc3f8206e1b1cbffe266762da43b53deb81",
          "message": "fix: keep data-gg-ready false during SSR after #51 (#64)\n\n* fix: keep data-gg-ready false during SSR after #51\n\nRestore the $effect gate so prerendered fixed-width SVG plots stay\ndata-gg-ready=\"false\" until the first client committed flush (decision 0009).\n$derived was emitting ready=true on SSR, which can race VR screenshot waits.\n\n* fix: clear data-gg-ready synchronously when unready\n\nPair the SSR clientFlush $effect gate with a derived isPlotReady predicate\nso readiness drops in the same render when the model/paint prerequisites\nfail (Codex P2 on #64), while prerender still stays false until client flush.",
          "timestamp": "2026-07-15T22:39:48-05:00",
          "tree_id": "fe987e8b53ce4cc34991dbf1931563011c8c60e8",
          "url": "https://github.com/ljodea/ggsvelte/commit/3635fcc3f8206e1b1cbffe266762da43b53deb81"
        },
        "date": 1784173226932,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4499,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8842,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.0209,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.5741,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.6575,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 130.6644,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0108,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2109,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.1186,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.7268,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.8305,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.4846,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.0829,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6628,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.4078,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5768,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.9376,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 582.5512,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.5394,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3cfb9c255f893d5369b075fe621133c911461139",
          "message": "refactor(svelte): extract pure presentation and interval-scene adapters (#66)\n\n* refactor(svelte): extract pure presentation and interval-scene adapters\n\nMove mergePresentationFocusKeys and intervalQuerySceneFromModel out of\nGGPlot so mask key union and interval query scene mapping are unit-tested\npure helpers with a narrow model port.\n\n* test(svelte): assert interval queryRect forwards expanded bounds\n\nCodex pre-PR P2: the adapter stub ignored queryRect arguments.",
          "timestamp": "2026-07-15T23:07:19-05:00",
          "tree_id": "6c69f84925d87a71012e511a5ce5f9ebbc7d0ee3",
          "url": "https://github.com/ljodea/ggsvelte/commit/3cfb9c255f893d5369b075fe621133c911461139"
        },
        "date": 1784174875671,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.0206,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.7074,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 13.9962,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 17.2605,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 96.6037,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 149.7886,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0487,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3178,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 95.2171,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 123.2629,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.5483,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.2477,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 126.7303,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6966,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.1903,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 6.6695,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 32.0285,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 644.7378,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 155.3047,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4a26d86aeac8ddb9ba250c488935fbbe68c6a642",
          "message": "refactor(svelte): extract pure live-region and plot-root layout helpers (#67)\n\n* refactor(svelte): extract pure live-region and plot-root layout helpers\n\nMove selection/legend/zoom announcement strings and root size/theme CSS\nserialization out of GGPlot into unit-tested pure helpers, and share\nresponsive width breakpoints for tool-rail and docked tooltip bindings.\n\n* fix(svelte): use ReadonlyZoomDomains in zoomAnnouncement\n\nAvoid deprecated ZoomDomains under type-aware oxlint.",
          "timestamp": "2026-07-15T23:28:17-05:00",
          "tree_id": "a62d9389f13d4a7843e21b969aff8cedd206402b",
          "url": "https://github.com/ljodea/ggsvelte/commit/4a26d86aeac8ddb9ba250c488935fbbe68c6a642"
        },
        "date": 1784176134469,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5316,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1215,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.719,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.9972,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 91.3778,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 123.4689,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0639,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.9543,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.1152,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.8717,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.0209,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.3253,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 119.0463,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6546,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.1183,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4939,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.4349,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 628.6798,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.76,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c07deff9bd37cbfb76f0b0e573d3f11185c20e20",
          "message": "refactor(svelte): extract pure legend discrete-only diagnostics (#68)\n\n* refactor(svelte): extract pure legend discrete-only diagnostics\n\nMove the inverted legend-focus discrete-only advisory gate out of GGPlot\ninto plot-capability so the not-discrete contract is unit-tested with a\nfixed catalog entry.\n\n* test(svelte): assert legend discrete-only diagnostic contract fields\n\nCodex pre-PR P2: avoid spreading the live catalog into the expected value.",
          "timestamp": "2026-07-16T00:00:48-05:00",
          "tree_id": "1a63d6743fdc38153e3ef84f82a4b4c6c9719e98",
          "url": "https://github.com/ljodea/ggsvelte/commit/c07deff9bd37cbfb76f0b0e573d3f11185c20e20"
        },
        "date": 1784178090310,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.7777,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.3123,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.1672,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.737,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.8906,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.0577,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1418,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2626,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.0933,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.0421,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.2459,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.5543,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 119.4283,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6332,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.929,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5317,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.1091,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 612.0185,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.4805,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "54c55f08462d56ed85aa710c4b3539ce2d044dd7",
          "message": "refactor(svelte): extract pure scoped zoom domain projection (#69)\n\n* refactor(svelte): extract pure scoped zoom domain projection\n\nMove controller snapshot zoom → continuous domain bag projection out of\nGGPlot commitZoom so scope matching and domain cloning are unit-tested.\n\n* test(svelte): avoid useless undefined in scoped zoom tests\n\nSatisfy unicorn/no-useless-undefined under type-aware oxlint.",
          "timestamp": "2026-07-16T00:26:57-05:00",
          "tree_id": "580f967b9a5a99c7dd5ae9513351b615ba6d164c",
          "url": "https://github.com/ljodea/ggsvelte/commit/54c55f08462d56ed85aa710c4b3539ce2d044dd7"
        },
        "date": 1784179650835,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5558,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.7907,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.3608,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.9189,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 81.8436,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.3229,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0468,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2388,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.6825,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.9184,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.4835,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.8679,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 120.0442,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6653,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.6668,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 8.218,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.1505,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 591.199,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.1171,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2e6c2c6bcb103544beee1299015c9fe9546211be",
          "message": "fix: harden legend-focus preview, keys, and live region after #50 (#70)\n\nAddress unrebutted Codex findings from the legend-focus feature PR:\n\n- Clear transient preview when focus leaves this plot (not only when\n  relatedTarget is a non-legend node)\n- Clear preview when focusing empty legend entries\n- Drop chart-local preview/commit when legendFocus is disabled\n- Reconcile transient preview when entry membership changes\n- Map scaled-constant layers into legend key index via layerScaledConstants\n- Render aria-live for legend-only focus (no surface tools required)\n\nSigned-zero equality stays intentional (legendValueEqual / tests).\nCross-batch SVG focus z-order deferred (panel dual-pass breaks stable mark\nnode identity needed for inspect).",
          "timestamp": "2026-07-16T00:43:56-05:00",
          "tree_id": "c2307b275f4fcadf7ab7bde75d947d1d0bf76c67",
          "url": "https://github.com/ljodea/ggsvelte/commit/2e6c2c6bcb103544beee1299015c9fe9546211be"
        },
        "date": 1784180671366,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.4007,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.6066,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.5505,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.8075,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 93.8904,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.7594,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0807,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.6203,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.4296,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.1544,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.3156,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.4809,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.639,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6633,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.9794,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4813,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 31.6197,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 599.4077,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.0556,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b6c71a6f42c56cd24ec22a0e1708ed77226dc811",
          "message": "refactor(svelte): extract pure legend clear-control source resolver (#71)\n\nMove clear-control InteractionSource classification out of GGPlot into\nplot-legend-surface so detail/touch priority is unit-tested alongside\nother legend event decisions.",
          "timestamp": "2026-07-16T01:07:17-05:00",
          "tree_id": "5b182efeedf684cad37447327b0596976fba03ca",
          "url": "https://github.com/ljodea/ggsvelte/commit/b6c71a6f42c56cd24ec22a0e1708ed77226dc811"
        },
        "date": 1784182071932,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8669,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 5.2066,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.0013,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.0732,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 90.0764,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 123.8251,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9822,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2537,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.0325,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.0912,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.4002,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.24,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.1835,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6334,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.2318,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3943,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 31.9229,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 599.7723,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.4191,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "f4fcbf8c731b7c0c987baee59e0205ddc1e53a2b",
          "message": "fix: harden manual-AT alias CSS combinator and rename audits after #54 (#72)\n\n- Treat star combinator CSS selectors (* +, * >, * ~) as substantive\n  runtime diffs, not JSDoc noise\n- Collect both sides of renames via git diff --name-status so moves out\n  of packages/{svelte,core}/src still fail the packaging-only alias audit\n\nPost-merge Codex also asked to bind aliases to the CI checkout tip; that\nis out of scope for historical packaging evidence (releaseCommit is the\npublished artifact, not every same-version main tip) and is already\ncovered by packageVersionAtCommit binding.",
          "timestamp": "2026-07-16T01:36:00-05:00",
          "tree_id": "f5c2eac0065fd937e8e03079aed02389843fc6eb",
          "url": "https://github.com/ljodea/ggsvelte/commit/f4fcbf8c731b7c0c987baee59e0205ddc1e53a2b"
        },
        "date": 1784183803010,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6733,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2584,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 12.4848,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 17.1734,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 102.8388,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 143.4966,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.2113,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.4993,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 99.1137,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 130.2673,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.1181,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.6434,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 132.8559,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6673,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 29.6317,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 6.9838,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 38.5371,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 660.4099,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 158.1301,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "37251ae9fe0ec01dd99c718788befbe01a200bd6",
          "message": "refactor(svelte): extract PlotLegendTargets from GGPlot (#73)\n\n* refactor(svelte): extract PlotLegendTargets from GGPlot\n\nMove interactive legend hit targets and clear control into an\ninternal child component with ToolRail-style callback props, keeping\nfocus state and side effects in GGPlot.\n\n* test(svelte): drop unnecessary non-null assertions in legend targets tests\n\nSatisfy type-aware oxlint for the PlotLegendTargets extraction suite.",
          "timestamp": "2026-07-16T02:01:23-05:00",
          "tree_id": "25fe01cd9a139e3a6465c2a2ae69290dd222a9f2",
          "url": "https://github.com/ljodea/ggsvelte/commit/37251ae9fe0ec01dd99c718788befbe01a200bd6"
        },
        "date": 1784185320673,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5941,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8031,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 12.182,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.5723,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 97.8807,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 123.9737,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0361,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2165,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.9794,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.3983,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.2704,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.2333,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.7057,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6563,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.0676,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.313,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.3662,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 606.713,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.6188,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "52307c586ca5fddb8b7d1e9df95d5ffbc2c2bc85",
          "message": "refactor(svelte): extract PlotCanvasA11y from GGPlot (#74)\n\nMove canvas-stratum a11y markup, table derivation, and styles into a\nchild component. Host keeps plot-scoped a11yTableOpen so interleaved\ncanvas strata still share open state. Characterization tests cover the\nchild surface; integration tests cover host wiring and shared open.",
          "timestamp": "2026-07-16T02:58:31-05:00",
          "tree_id": "6cf0c62a34866eeb207c8967b9bd2baa8d04e228",
          "url": "https://github.com/ljodea/ggsvelte/commit/52307c586ca5fddb8b7d1e9df95d5ffbc2c2bc85"
        },
        "date": 1784188746273,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6697,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.3903,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 13.8124,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.1413,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.5562,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.8262,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9741,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2027,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 83.381,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.1384,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.6621,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.0174,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.5439,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6631,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.5403,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.2672,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.7423,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 615.8228,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.8421,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "dda80030bf51cdb8e22d94870f29a3f0239ecc22",
          "message": "refactor(svelte): extract pure inspection-host decisions from GGPlot (#75)\n\nMove setInspection / toggleInspectionPin / completeness / mode gates into\nplot-surface-inspection pure helpers with characterization tests. Host keeps\nreducer, coordinator, and side-effect ordering (including dual clear\ndispatches and announcement-before-gate).",
          "timestamp": "2026-07-16T03:16:09-05:00",
          "tree_id": "4d1918fc092ba22fd9a87fec98beda3f2a955327",
          "url": "https://github.com/ljodea/ggsvelte/commit/dda80030bf51cdb8e22d94870f29a3f0239ecc22"
        },
        "date": 1784189813737,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4141,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8703,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.581,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.541,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.221,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.1753,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9741,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2157,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 83.6113,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.195,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.7539,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.3475,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.1156,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6318,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.9234,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3574,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.4527,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 590.6389,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.5213,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "eb3ff9744064dcb48fccf34e4fb8daf5066bbc77",
          "message": "fix: limit zoom reset/write scope by mode and detect facet prop early after #61 (#76)\n\n- filterScopeChannelsByZoomMode so x-only linked plots do not clear shared\n  y domains on Reset / commitZoom / resetScales\n- Detect faceted intent from the raw facet prop (not assembled.facet) so\n  declaration-only children take the diagnostic/no-op path before layers\n  register",
          "timestamp": "2026-07-16T03:24:51-05:00",
          "tree_id": "69630d1a93309cf79a363e4c1887b112be109791",
          "url": "https://github.com/ljodea/ggsvelte/commit/eb3ff9744064dcb48fccf34e4fb8daf5066bbc77"
        },
        "date": 1784190329277,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 1.9654,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.3336,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 7.9072,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 11.0629,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 70.0807,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 98.4173,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.8448,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 0.964,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 71.9089,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 87.5172,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 9.4735,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 9.6817,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 91.5394,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.5125,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 21.7089,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.7864,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 23.166,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 500.8487,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 131.1218,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "65d10431809ec826803549785a443add45b1b9fb",
          "message": "refactor(svelte): extract pure surface-dismiss and finish-brush decisions (#77)\n\nMove capture-surface leave/blur/outside-pointer and finish-brush tool\nrouting into pure decision tables so host handlers only own side effects.",
          "timestamp": "2026-07-16T03:45:22-05:00",
          "tree_id": "ef1dbb3c85c9bd2d7c3f0e775933890f7e148020",
          "url": "https://github.com/ljodea/ggsvelte/commit/65d10431809ec826803549785a443add45b1b9fb"
        },
        "date": 1784191559391,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.9077,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.312,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.6081,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.889,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 90.7027,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 124.0252,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.028,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.5813,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.4008,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.8409,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.0132,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.9003,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 122.1216,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6381,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.5528,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3398,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.6644,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 592.3527,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.3998,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e0c7562d771f0b535b4d5afe8161fb491129dcd6",
          "message": "fix: detect facet intent from raw prop or assembled spec after #76 (#78)\n\n#76 switched faceted interaction gating to the raw facet prop so\ndeclaration-only children take the diagnostic path before layers register.\nThat missed portable-spec plots that embed facet without a separate prop,\nso controlled zoom could throw for missing x/y scopes instead of no-op.\n\nisFacetedPlotIntent unions both sources; normalizeInteractionConfig and\nresolveInteractionScope keep the faceted diagnostic/no-op path for either.",
          "timestamp": "2026-07-16T03:54:49-05:00",
          "tree_id": "f5bf7d987f6e15e2ce8ea1482a4f133e8f038f89",
          "url": "https://github.com/ljodea/ggsvelte/commit/e0c7562d771f0b535b4d5afe8161fb491129dcd6"
        },
        "date": 1784192122870,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.8443,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1249,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.8809,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.1634,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 86.3482,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.9638,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9854,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2075,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.4275,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.8459,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.6058,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.5459,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.4578,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.656,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.6134,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.41,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.9552,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 624.2294,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.1091,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a9c6619a87f2ce1fa9323fe18f8d874effa95f42",
          "message": "refactor(svelte): extract pure tool, lost-capture, and inspection-emit decisions (#80)\n\n* refactor(svelte): extract pure tool, lost-capture, and inspection-emit decisions\n\nMove chooseTool/effective-tool routing, lostpointercapture area-kind\nrouting, and inspection emission fingerprint gating into pure decision\ntables so GGPlot host handlers only own side effects.\n\n* fix(svelte): silence push-hook lint on host-seam extraction\n\nDrop a trailing switch return and avoid a useless undefined arg in the\ninspection-emit sequence test.",
          "timestamp": "2026-07-16T04:02:35-05:00",
          "tree_id": "1a22c31f6664729fcde5d76f90fc406f4dc2dbd3",
          "url": "https://github.com/ljodea/ggsvelte/commit/a9c6619a87f2ce1fa9323fe18f8d874effa95f42"
        },
        "date": 1784192596714,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8082,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.0209,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.734,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.8809,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 88.0714,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.4527,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0616,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.6457,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.9477,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.979,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.6341,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.84,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.5862,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6632,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.9254,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.6922,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.3733,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 605.8938,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.3991,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "964aa6f15c732c95886c277bebfcf83a645e5984",
          "message": "refactor(svelte): extract pure legend commit, preview-dismiss, and live-text decisions (#81)\n\n* refactor(svelte): extract pure legend commit, preview-dismiss, and live-text decisions\n\nMove commitLegend routing, previewLegend(null) dismiss policy, and\ninteraction live-region text precedence into pure helpers so GGPlot hosts\nonly own side effects. Characterization tests pin toggle-before-empty-keys\nand committed-vs-effective emphasis asymmetry.\n\n* fix(svelte): drop redundant switch returns in commitLegend\n\nSatisfy no-useless-return on the pure-seam host switch.",
          "timestamp": "2026-07-16T04:21:29-05:00",
          "tree_id": "1aae60fde22b1a32158f9aa7cec6158be9c677fc",
          "url": "https://github.com/ljodea/ggsvelte/commit/964aa6f15c732c95886c277bebfcf83a645e5984"
        },
        "date": 1784193725272,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.1867,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.7148,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.0095,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.1709,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 81.3942,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 112.1395,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.854,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.0927,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 80.476,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 100.9349,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 9.3028,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 9.0002,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 107.8618,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.565,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 23.3208,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.4968,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.4922,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 545.3548,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 128.3359,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a42497f81b2735ac862f5209903bdc432789eb7c",
          "message": "fix: keep JSDoc list/blockquote markers non-substantive after #72 (#82)\n\n* fix: keep JSDoc list/blockquote markers non-substantive after #72\n\n#72 treated any `* +`, `* >`, or `* ~` line as CSS so combinator selectors\nwere not skipped as JSDoc noise. That also classified Markdown list and\nblockquote comment lines as runtime changes, rejecting documentation-only\nalias ranges.\n\nCombinators are substantive only when followed by a selector fragment\n(`*`, class/id/attr/pseudo, or type selector with CSS structure).\n\n* fix: treat bare lowercase type selectors after combinators as CSS\n\nMulti-line CSS like `* + p` / `* + section` with `{` on the next line must\nstay substantive for the manual-AT alias audit. Keep capitalized and\nmulti-word text (`* > Note`, `* + positive values…`) as JSDoc/Markdown.",
          "timestamp": "2026-07-16T04:32:44-05:00",
          "tree_id": "f9ee53f93b6332b3686a02d5bb5af03d88faf059",
          "url": "https://github.com/ljodea/ggsvelte/commit/a42497f81b2735ac862f5209903bdc432789eb7c"
        },
        "date": 1784194400390,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4284,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8793,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.537,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.4917,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.7688,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.5538,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.4777,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.9115,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 89.7649,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.3028,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.1191,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.0111,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.4995,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6632,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 25.5877,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5979,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.0798,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 596.4108,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.8629,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "84e8e56b692b2b3d94ea0d45d5df3280621fa9b8",
          "message": "refactor(svelte): extract PlotStatusChrome from GGPlot (#83)\n\n* refactor(svelte): extract PlotStatusChrome from GGPlot\n\nMove status/a11y chrome (sr-only instructions, live region, empty state,\ncapability status) and clear-legend x lookup out of GGPlot so the host\nkeeps interaction wiring only. Characterization tests cover gates, ids,\nand the legend-focus runtime-disable clear suppress path.\n\n* fix(svelte): mirror reduced-motion resets in PlotStatusChrome\n\nParent-scoped GGPlot reduced-motion rules no longer match extracted\nchrome nodes; keep the policy component-local with a regression check.",
          "timestamp": "2026-07-16T04:46:56-05:00",
          "tree_id": "c6d7f27588b6ef8cda5a0336e22c9952402dbd9a",
          "url": "https://github.com/ljodea/ggsvelte/commit/84e8e56b692b2b3d94ea0d45d5df3280621fa9b8"
        },
        "date": 1784195250592,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.3492,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.2746,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.8676,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.3481,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.3273,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.5426,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0891,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3004,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 82.9285,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.1573,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.6281,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.2795,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.3905,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6581,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.4921,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4437,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.1703,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 627.6233,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 163.1746,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "651ad96c8c84f83627797b6ce5344d83e91cbdea",
          "message": "refactor(core): extract pipeline geometry, facets, and shared types (#84)\n\n* refactor(core): extract pipeline geometry, facets, and shared types\n\nSplit the 3.7k-line pipeline monolith into focused modules under\npipeline/{types,geometry,facets}.ts while preserving the public\npipeline.ts import surface. Characterization tests pin batch mark\ncounts, coord-flip vertex mapping, and facet partition contracts.\n\n* fix(core): unexport internal BoxFrame and FacetPanelDef\n\nKeep knip clean: both types are only used within their modules.",
          "timestamp": "2026-07-16T04:52:03-05:00",
          "tree_id": "308535887b837887a8b04a1d48de36b9277f9f2e",
          "url": "https://github.com/ljodea/ggsvelte/commit/651ad96c8c84f83627797b6ce5344d83e91cbdea"
        },
        "date": 1784195567380,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.2299,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.8251,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 14.0949,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.7303,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 90.8257,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 124.9232,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0467,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3017,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.9421,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.9523,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.2249,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.8512,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 126.1723,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6469,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 33.1798,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 8.0514,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 31.6368,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 604.6207,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 164.8406,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5cfbda520e7405e0631e69d95de3c1c8883daa98",
          "message": "refactor(svelte): extract PlotMarkStrata and pure canvas paint (#85)\n\n* refactor(svelte): extract PlotMarkStrata and pure canvas paint\n\nMove mark-strata compositing (canvas/svg sandwich, theme redraw, first-paint\nnotify) out of GGPlot. Host keeps the paint ledger and readiness gate;\npaint succeeds only when a 2d context exists so data-gg-ready stays honest.\n\n* fix(svelte): silence type-aware lint in PlotMarkStrata tests\n\nUse typed mocks, dataset theme flips, and onPainted counts for theme redraw.\n\n* fix(svelte): drop unnecessary type assertion in mark-strata tests",
          "timestamp": "2026-07-16T05:05:22-05:00",
          "tree_id": "df55db1f9da957204f51f9b25a59df18d8e55619",
          "url": "https://github.com/ljodea/ggsvelte/commit/5cfbda520e7405e0631e69d95de3c1c8883daa98"
        },
        "date": 1784196356357,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3476,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8744,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.2762,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.355,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.9671,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.1097,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.404,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.196,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.4959,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.9884,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.4774,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.2364,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.7318,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6588,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.8836,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3184,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.041,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 616.8592,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.2268,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8eb0a043d68f10da86648d385dd0d85e9ba03950",
          "message": "refactor(core): extract pipeline bind and scale-training modules (#86)\n\nPeel data/layer binding and axis/color scale training out of the\npipeline orchestrator into pipeline/bind.ts and pipeline/scale-training.ts.\nPublic runPipeline surface is unchanged. Characterization tests cover\nbind error codes, axis type inference, and color scale resolution.",
          "timestamp": "2026-07-16T05:10:53-05:00",
          "tree_id": "70375e949b9c24214c1fcb2af10b981c95938a1c",
          "url": "https://github.com/ljodea/ggsvelte/commit/8eb0a043d68f10da86648d385dd0d85e9ba03950"
        },
        "date": 1784196690591,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4064,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.7913,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.8051,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.3231,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.2168,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.4675,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.4473,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2948,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.1743,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 114.5176,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.7947,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.8655,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.9235,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6545,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.1879,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3637,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.9941,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 617.4277,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.8485,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b41c4718bc42ad126f4e91056015a3eb80f524ba",
          "message": "refactor(svelte): extract shared candidate store walk helpers (#87)\n\nAdd iterateCandidates/collectCandidates so GGPlot presentation paths\n(anchors, interaction masks, legend key index, hit match) share one\nid-ascending null-skipping walk instead of four copy-pasted loops.",
          "timestamp": "2026-07-16T05:22:19-05:00",
          "tree_id": "7c8e83f8dc7fd94340ebdfe78441dafeef54bf24",
          "url": "https://github.com/ljodea/ggsvelte/commit/b41c4718bc42ad126f4e91056015a3eb80f524ba"
        },
        "date": 1784197384737,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.0648,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.9938,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.2529,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.4799,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.7818,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.0427,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0038,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2437,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.0505,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.692,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.8377,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.2553,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.4113,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6329,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.7139,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3639,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.3539,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 622.1956,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.8031,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "24e37ebcbea068216ed012c7f8276d3bc1800d0b",
          "message": "refactor(core): extract pipeline frame, position, and layout helpers (#89)\n\n* refactor(core): extract pipeline frame, position, and layout helpers\n\nSplit post-bind stats/frame construction, data-space position adjust,\nand layout/scene helper functions out of the pipeline orchestrator.\nrunPipeline is now primarily orchestration over focused modules.\nCharacterization tests pin buildFrame stats contracts and stack/dodge/jitter.\n\n* fix(core): drop unnecessary non-null assertion in position test",
          "timestamp": "2026-07-16T05:32:06-05:00",
          "tree_id": "7117dc09dca4b76af79b59a263fd7dde8ef39e23",
          "url": "https://github.com/ljodea/ggsvelte/commit/24e37ebcbea068216ed012c7f8276d3bc1800d0b"
        },
        "date": 1784197960687,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.136,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.4454,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 17.4024,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.0501,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.5963,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 130.6811,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.921,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.6737,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.8197,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.8826,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.5279,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.312,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.9787,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6566,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.2097,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.627,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 32.4088,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 624.6896,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.1529,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "12d2987b0375fc091fcf7fd0acb4c1b88228d7e8",
          "message": "fix: treat CSS descendant chains after combinators as substantive after #82 (#88)\n\n* fix: treat CSS descendant chains after combinators as substantive\n\nCodex P2 on #82: `* > ul li {…}` / `* + section a {…}` were classified as\nJSDoc noise because the post-combinator check stopped at the first type\nselector. Allow type chains with CSS structure, and bare multi-type chains\nwhen every token is a known HTML/SVG type so English multi-word docs stay\nskippable.\n\n* fix: tighten post-combinator CSS vs JSDoc classification\n\nAddress Codex P2s on #88:\n- multi-word prose with weak punctuation (`,`, `. Kept`) stays docs\n- tag-word English (`a button`, `data table`) stays docs via prose denylist\n- universal in descendant chains (`ul *`) is CSS\n- bare multi-token CSS types (incl. svg use) when not prose-ambiguous",
          "timestamp": "2026-07-16T05:40:37-05:00",
          "tree_id": "21ab1eee6ff1a044fb409e1089abf3f47c1749b7",
          "url": "https://github.com/ljodea/ggsvelte/commit/12d2987b0375fc091fcf7fd0acb4c1b88228d7e8"
        },
        "date": 1784198474092,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.7738,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.3906,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.3568,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.5687,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.4694,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.1191,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.953,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.228,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.8852,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.1157,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.6826,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.8642,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.5582,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6553,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.6862,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.294,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.4821,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 624.0657,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 163.1208,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "edd9dadb5007c6967e774590ef20980c7ed1bc3c",
          "message": "refactor(svelte): extract PlotCaptureSurface and shared isAreaTool (#90)\n\n* refactor(svelte): extract PlotCaptureSurface and shared isAreaTool\n\nMove the capture layer markup and styles out of GGPlot, export a single\nisAreaTool predicate from interaction for keyboard/pointer/capture, and\nuse :global reduced-motion under the plot root so child components stay covered.\n\n* fix(svelte): silence type-aware lint on PlotCaptureSurface\n\nDrop useless undefined default and narrow the bindable element assertion.\n\n* fix(svelte): avoid type-aware lint on bind element classList\n\nAssert bind identity against the rendered .gg-capture node instead of\nclassList access on the narrowed local.",
          "timestamp": "2026-07-16T05:48:31-05:00",
          "tree_id": "eb21941627bdfd6d90e83e03c298d24ac50c98eb",
          "url": "https://github.com/ljodea/ggsvelte/commit/edd9dadb5007c6967e774590ef20980c7ed1bc3c"
        },
        "date": 1784198950496,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8518,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0408,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.1263,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.3113,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.1948,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.4503,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9325,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3744,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.4094,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.4786,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.6816,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.5764,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.9429,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6607,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.573,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3858,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.5602,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 629.1036,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.2627,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "85fd843a672cb848a9cc8298ba4ffcda04f8b8f2",
          "message": "refactor(core): extract runPipeline layout, scene, contracts, candidates (#91)\n\n* refactor(core): extract runPipeline layout, scene, contracts, candidates\n\nPeel the remaining large runPipeline phases into focused modules:\npanel layout, geometry/scene assembly, per-layer contracts, and\ninteraction candidate construction. The orchestrator is now a thin\npipeline of phase calls. Characterization tests cover backends,\ntooltip fields, scaled constants, and facet layout placement.\n\n* fix(core): keep empty-data layer contracts aligned by layer index\n\nresolveLayerFields/ScaledConstants now take layerCount and pad missing\nbindings, matching the pre-extract empty-data indexing contract.\n\n* fix(core): avoid expect.arrayContaining in layer-contracts test",
          "timestamp": "2026-07-16T05:55:07-05:00",
          "tree_id": "37db00a75674dfaf0f62cd49489ec34f2fabb48c",
          "url": "https://github.com/ljodea/ggsvelte/commit/85fd843a672cb848a9cc8298ba4ffcda04f8b8f2"
        },
        "date": 1784199348793,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 1.9358,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.1998,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 7.4474,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 9.9198,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 63.1987,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 95.878,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.7609,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 0.9583,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 70.0924,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 87.0271,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 8.8937,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 9.1482,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 98.0147,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6363,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 24.2505,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.6174,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 22.1568,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 483.4565,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 130.2195,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "320ae5974a41ccfe34c8b5ac7b3db916bd365809",
          "message": "refactor(svelte): extract tool-rail and tooltip viewport pure helpers (#92)\n\nLift shouldShowToolRail and tooltipViewportSize out of GGPlot, hoist shared\nselection recovery deriveds for ToolRail props, and pin nullish coalesce\nsemantics for zero client sizes.",
          "timestamp": "2026-07-16T05:58:46-05:00",
          "tree_id": "bf56545b2990e3fa249bbb624c36d584f2d6ffe3",
          "url": "https://github.com/ljodea/ggsvelte/commit/320ae5974a41ccfe34c8b5ac7b3db916bd365809"
        },
        "date": 1784199564402,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.7551,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9356,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.9909,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.1485,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 96.4897,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 144.7448,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0027,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3549,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 96.6722,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 123.2026,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.1842,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.8212,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 128.8602,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7725,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 25.1935,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 6.8955,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 34.6836,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 657.3203,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 156.1116,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c4cd874c26e3b3b70c7e57f7b13c8262bed785be",
          "message": "refactor(svelte): extract PlotSceneOverlays and capture aria helper (#93)\n\nCompose inert vs surface InteractionOverlay behind a structural else-if,\nunit-test shouldShowInertSelectionOverlay and resolveCaptureAriaControls,\nand drop the unused InteractionOverlay import from GGPlot.",
          "timestamp": "2026-07-16T06:08:00-05:00",
          "tree_id": "3c6169508a147ecc81e80f16bd48ac08d4dcd131",
          "url": "https://github.com/ljodea/ggsvelte/commit/c4cd874c26e3b3b70c7e57f7b13c8262bed785be"
        },
        "date": 1784200117606,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.9623,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.3013,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.5994,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.0949,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.7385,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.5695,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0535,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1941,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.8389,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.8969,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.4089,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.6045,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 123.2889,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8158,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 29.5506,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.2575,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.1404,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 618.9604,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.7529,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "aef2312ca8ea77602ee3d1d013a78f939386039d",
          "message": "refactor(core): split geometry builders and thin runPipeline phases (#94)\n\nBreak the ~1k-line geometry module into shared primitives, simple marks,\nand composite builders, keeping a thin dispatch facade. Also extract\npreparePanels and trainPipelineScales so runPipeline is a short phase\nchain. Characterization tests cover geom dispatch and panel preparation.",
          "timestamp": "2026-07-16T06:14:16-05:00",
          "tree_id": "a94bb93ff137b73d8d2c35ca4d00e8e0adc8749c",
          "url": "https://github.com/ljodea/ggsvelte/commit/aef2312ca8ea77602ee3d1d013a78f939386039d"
        },
        "date": 1784200497449,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.9301,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1139,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.9188,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.5452,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.5596,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.1087,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.994,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2469,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.5541,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.0995,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.9922,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.8687,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.1872,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8011,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.5059,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3539,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.7828,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 598.0466,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.9733,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "2be098023117df3b4608437905bb7c9983a5e157",
          "message": "refactor(svelte): extract panel, empty-plot, and tooltip-dock pure helpers (#95)\n\nLift panelContainingAnchor, isEmptyPlotScene, and isTooltipDocked out of\nGGPlot so inspection panel hit-testing, empty-state detection, and docked\ntooltip chrome share one tested path.",
          "timestamp": "2026-07-16T06:18:08-05:00",
          "tree_id": "4709a6aed0b7f48462c13adef8cdfdb13b180285",
          "url": "https://github.com/ljodea/ggsvelte/commit/2be098023117df3b4608437905bb7c9983a5e157"
        },
        "date": 1784200728073,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8233,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.4315,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.6699,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.1147,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.2791,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.3212,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9903,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2356,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.8967,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.2962,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.3994,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.8334,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.4729,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7949,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.3413,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3335,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.8106,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 601.2417,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.5443,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "11c7db802f48ad4e4263526f26bf306ab32fa2fd",
          "message": "fix: refine post-combinator CSS vs JSDoc after #88 (#96)\n\nPost-merge Codex P2s on #88:\n- bare multi-token chains use an HTML/SVG type allowlist so arbitrary\n  prose (`minimum latency`) stays docs while real tags stay CSS\n- strong structure is recognized anywhere (`ul li, ol li {…}`)\n- weak combinators recurse so multi-token continuations (`ul li > a`)\n  count as CSS without treating English commas as selectors\n- article-led and known tag-word collocations stay documentation",
          "timestamp": "2026-07-16T06:25:35-05:00",
          "tree_id": "6ce0f35acaf802413f7815727afcc421324998a0",
          "url": "https://github.com/ljodea/ggsvelte/commit/11c7db802f48ad4e4263526f26bf306ab32fa2fd"
        },
        "date": 1784201176509,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6267,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1255,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.6952,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.2278,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.9477,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 116.0917,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1507,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2292,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.242,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.2717,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.3077,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.1333,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.7903,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8009,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.646,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3837,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.1865,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 611.4439,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.1253,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "00b8d2731031b075febab16ce61903c46e912704",
          "message": "refactor(svelte): extract plot size and area-kind pure helpers (#98)\n\nAdd resolvePlotSize for container/fixed width and height fallbacks, centralize\nisAreaBrushing/isAreaAwaitingSecond next to AreaKind, and move capture\npointer-cancel/lost-capture handlers out of the GGPlot template.",
          "timestamp": "2026-07-16T06:31:52-05:00",
          "tree_id": "403b85f322d2374f6e07abba5e93ab2b2d246218",
          "url": "https://github.com/ljodea/ggsvelte/commit/00b8d2731031b075febab16ce61903c46e912704"
        },
        "date": 1784201545264,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6247,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9751,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.9971,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.1556,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.2204,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.8355,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9756,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.8825,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.2854,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.678,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.068,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.6844,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.5425,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7627,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.9334,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.2558,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.5782,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 584.2226,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.3507,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "c7ab917f5cfe05dbdd6ad19837e844667ab59900",
          "message": "refactor(svelte): extract data-identity, legend-clear, and inspect-ref helpers (#99)\n\nLift dataIdentityEpochToken, shouldEmitLegendFocusClear (documented vs\npreview-dismiss emphasis source), and lazy buildInspectionCandidateRef so\nhot pointer apply paths avoid eager indexOf when candidate ids are present.",
          "timestamp": "2026-07-16T06:40:24-05:00",
          "tree_id": "5592ee26366d385e4cfadca735fd0a86f9513deb",
          "url": "https://github.com/ljodea/ggsvelte/commit/c7ab917f5cfe05dbdd6ad19837e844667ab59900"
        },
        "date": 1784202057528,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5221,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8178,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.6845,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.0116,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.8378,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.6713,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9616,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1884,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.6951,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.21,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.5676,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.5502,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.7135,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7656,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.2763,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3486,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.9244,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 622.9635,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.2815,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "36d3d9520041f306d1786b1d547561b1ea80938e",
          "message": "refactor(core): split frame stats and assemble render model (#97)\n\n* refactor(core): split frame stats and assemble render model\n\nBreak frame.ts into helpers, non-identity stats, and candidate factories.\nExtract domain snapshot computation and RenderModel assembly so runPipeline\nstays a short phase chain. Tests cover dispose/row contracts and frozen\ndomain snapshots.\n\n* fix(core): use binding.layer.params in annotation frame branch\n\nThe unused layer destructure was removed too aggressively; restore\nparams access via binding.layer so annotation rules keep intercepts.",
          "timestamp": "2026-07-16T06:45:52-05:00",
          "tree_id": "47168739a0a33bf407264ba8aa68d0ae51b8ba58",
          "url": "https://github.com/ljodea/ggsvelte/commit/36d3d9520041f306d1786b1d547561b1ea80938e"
        },
        "date": 1784202386933,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.7674,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.1865,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.7502,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.3063,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 89.4859,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 128.4051,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0744,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2786,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 90.0151,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 122.908,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.9429,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.9518,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 124.505,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8092,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.8605,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3961,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.6807,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 598.0882,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.7994,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "205c8236e974f18ff9bcf4750e1321e56ac5523e",
          "message": "refactor(svelte): extract pointer-host brush and inspect queue builders (#100)\n\nAdd initialBrushRect for begin-area draft corners, buildQueuedPointerInspection\nwith coupled CandidateMatch mode/candidate, and persistentSelectionOrNull for\nshared pointer/keyboard interval commit policy. Export QueuedPointerInspection\nfrom the inspection host module.",
          "timestamp": "2026-07-16T06:50:41-05:00",
          "tree_id": "c17023c3e42b51b90babe9e0fd7b67fbaf4f9d18",
          "url": "https://github.com/ljodea/ggsvelte/commit/205c8236e974f18ff9bcf4750e1321e56ac5523e"
        },
        "date": 1784202693209,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5599,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.7352,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.6191,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.5919,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.4185,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.0975,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9989,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.225,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.2184,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.5779,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.3767,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.6959,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.3826,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8089,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.2861,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.229,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.9367,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 588.3042,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.9981,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "50ea8d8899d842823712b4bb385a3740c81c051b",
          "message": "refactor(svelte): extract scene-inspect reconcile plan and pin chrome gates (#101)\n\nAdd planSceneInspectReconcile for the model-run inspection effect priority\ntable, shouldAnnounceUnpin/shouldFocusPinnedInteractiveTooltip for pin\nchrome, and plotTooltipDomId shared by aria-controls and tooltip focus/id.",
          "timestamp": "2026-07-16T07:00:36-05:00",
          "tree_id": "838b283ac28e4548118c66eb047a8f4760441d48",
          "url": "https://github.com/ljodea/ggsvelte/commit/50ea8d8899d842823712b4bb385a3740c81c051b"
        },
        "date": 1784203276307,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.823,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0577,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.5197,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.2377,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.3768,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.8501,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9804,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2297,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.6823,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.8529,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.1369,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.8181,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.9119,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7961,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.7482,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.443,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.895,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 604.4163,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.2231,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4e20a5177c20188bdb5c0bbd3d6fab5b16243936",
          "message": "refactor(core): split bind and scale modules; extract run setup (#102)\n\nBreak bind into bind-data/bind-layer and scale-training into\nscale-axis/scale-color facades. Extract setupPipelineRun so pipeline.ts\nis a short phase chain (~250 lines). Tests cover setup normalize/flip\nand theme rejection contracts.",
          "timestamp": "2026-07-16T07:08:29-05:00",
          "tree_id": "0b166543d9a555a2d7cb07f94f1281cb00e868dd",
          "url": "https://github.com/ljodea/ggsvelte/commit/4e20a5177c20188bdb5c0bbd3d6fab5b16243936"
        },
        "date": 1784203742915,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6215,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8838,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.667,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.0076,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 80.0851,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.0584,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9926,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2124,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 89.2794,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 115.0505,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.4874,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.862,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 123.3238,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8667,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.3339,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.385,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 34.7688,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 620.4116,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.2231,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "5313f72d4ddbbf380f44d4a98a418560d5cfd045",
          "message": "refactor(svelte): extract semantic-key and legend-index plot adapters (#103)\n\nAdd resolveSemanticKeysForPlot and buildLegendEntryKeyIndexForPlot for null-model\nshort-circuit and RenderModel adaptation, and fold select-area start emission into\nresolvePointerDownAction.begin-area.emitSelectStart.",
          "timestamp": "2026-07-16T07:14:34-05:00",
          "tree_id": "b56904f3f5f53c3394dbd2065a8716ec09a4daae",
          "url": "https://github.com/ljodea/ggsvelte/commit/5313f72d4ddbbf380f44d4a98a418560d5cfd045"
        },
        "date": 1784204107217,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.1901,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0258,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.4201,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.3214,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 81.8604,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 116.6179,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0047,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3281,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.9545,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.8214,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.1666,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.4438,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 112.6942,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7985,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 24.5867,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3443,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.3273,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 589.3024,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.3934,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "7ceccd46d6ca51f3c0f119f2a9665a1dd6a569c9",
          "message": "fix: accept custom/SVG/anchor bare type chains after #96 (#104)\n\nPost-merge Codex P2s on #96:\n- expand SVG allowlist (polygon, polyline, ellipse, filters, …)\n- accept HTML custom elements (hyphenated) in bare multi-token chains\n- stop blanket-skipping anchor-led chains so `a span` / `a img` stay CSS",
          "timestamp": "2026-07-16T07:24:40-05:00",
          "tree_id": "43e8a0cd67dae52f1786f1feffa4af6c18be4095",
          "url": "https://github.com/ljodea/ggsvelte/commit/7ceccd46d6ca51f3c0f119f2a9665a1dd6a569c9"
        },
        "date": 1784204714186,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.9095,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0461,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.7605,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.185,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.9437,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 123.7927,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0118,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2414,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.1617,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.3532,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.3596,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.9496,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.873,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8145,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.8684,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3051,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.3294,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 633.4312,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.9376,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a6bfa7cfd96cff899548bf84d7b7d1899602fdf6",
          "message": "refactor(svelte): extract legend host effect decision plans (#105)\n\nMove committed-reconcile, focus-disabled clear, and roving-focus sync\npolicy out of GGPlot into pure planLegend* helpers with characterization tests.",
          "timestamp": "2026-07-16T07:29:35-05:00",
          "tree_id": "51211ce9d5a06933a6133189cd8e64d3f615c128",
          "url": "https://github.com/ljodea/ggsvelte/commit/a6bfa7cfd96cff899548bf84d7b7d1899602fdf6"
        },
        "date": 1784205059905,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8114,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8954,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.9343,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.5019,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 98.2021,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 140.1589,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.214,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3793,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 98.668,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 123.7235,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.6426,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.587,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 130.4074,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.9201,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.8029,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 6.9356,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 36.53,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 658.4012,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 156.9587,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "58736a51f62ac6e7398cd8ed1ae2a570883210dc",
          "message": "refactor(core): split geometry marks and extract finalizePipelineRun (#106)\n\nCollapse remaining post-scale orchestration into finalize-run, and move\npoint/path, bar/rule/text, and composite geom builders into focused modules\nbehind thin facades. Characterization tests lock layer-major paint order and\ngeom batch kinds.",
          "timestamp": "2026-07-16T07:34:31-05:00",
          "tree_id": "d94ce90f3c02ed660fb5986f9e31e3dc8055d1ad",
          "url": "https://github.com/ljodea/ggsvelte/commit/58736a51f62ac6e7398cd8ed1ae2a570883210dc"
        },
        "date": 1784205313336,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6612,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8511,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.8036,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.9215,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 77.424,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.9902,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0587,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2338,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.716,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.3103,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.7613,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.8506,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 119.3964,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 1.4387,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.4731,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.532,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.5583,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 584.2244,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.6341,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a3cc066cbebf0dfb8bc65b3347ff16b2603b8c3c",
          "message": "refactor(svelte): extract dismiss and traversal host plans (#107)\n\nExpand complete-area with finish select|zoom, unify escape/close via\nplanInspectionDismiss, and route directional/coincident navigation through\nthunk-backed traversal step plans.",
          "timestamp": "2026-07-16T07:46:15-05:00",
          "tree_id": "42f4b9bd9d2ccb77dcf5fb7f986d1147b4476d1c",
          "url": "https://github.com/ljodea/ggsvelte/commit/a3cc066cbebf0dfb8bc65b3347ff16b2603b8c3c"
        },
        "date": 1784206015477,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.9461,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2561,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.4899,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.6535,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.1193,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.5978,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.085,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2707,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.0674,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.7801,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.909,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.2952,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.2492,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8168,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.8387,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.2894,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.5823,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 625.9198,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.6282,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e834dc36d60e2ce1fa8ad1ba2b8300f7116bfc2e",
          "message": "refactor(core): split bind-layer validation and panel layout paths (#108)\n\nExtract field helpers and geom/stat contracts from bind-layer, and split\nfacet vs single-panel placement out of computePanelLayout. Characterization\ntests pin rule forms, color-on-fill warnings, free_y axes, and coord-flip labs.",
          "timestamp": "2026-07-16T07:51:22-05:00",
          "tree_id": "1b5285a151792b2388634a2f1e3ba0c573df3e81",
          "url": "https://github.com/ljodea/ggsvelte/commit/e834dc36d60e2ce1fa8ad1ba2b8300f7116bfc2e"
        },
        "date": 1784206322682,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8133,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9973,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.402,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.2914,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.182,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.1526,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.007,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2411,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.0474,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.3739,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.6595,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.799,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.2749,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7321,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.3504,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.8352,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 41.4128,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 594.6706,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.2743,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ee240c6ebc3164b95dbebcbc356f9966d49615c7",
          "message": "refactor(core): split frame-stats and scale-axis modules (#110)\n\nDispatch non-identity LayerFrame stats into binning (count/bin/density) and\nfit (smooth/boxplot/summary) modules; split positional scale train vs evidence\ncollection. Characterization tests pin density/smooth/boxplot/summary frames\nand axis evidence for bars and bins.",
          "timestamp": "2026-07-16T07:58:55-05:00",
          "tree_id": "e5940d7630397ef596521c2962aefb8d573bc72a",
          "url": "https://github.com/ljodea/ggsvelte/commit/ee240c6ebc3164b95dbebcbc356f9966d49615c7"
        },
        "date": 1784206768526,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6153,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.5532,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 8.4795,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.3869,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 81.8971,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.9038,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.906,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1265,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 90.323,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.5544,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 10.3464,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 10.3579,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 108.756,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6821,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 22.293,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.4218,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.846,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 563.8437,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 129.0861,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "8eca7dce600a13e9e392272797160d9c68dfe51a",
          "message": "refactor(svelte): extract cohesive queue-inspect frame builder (#109)\n\nAdd buildQueuedInspectFrame to own the match-null branch for hit resolution\nand reducer candidate refs with lazy hitTest/panelId thunks; export pointer\nsource mapping and touch-inspect click suppress constant.",
          "timestamp": "2026-07-16T08:02:39-05:00",
          "tree_id": "0587bd787ba95fbadd768c9e9cf9c0ca3a49d276",
          "url": "https://github.com/ljodea/ggsvelte/commit/8eca7dce600a13e9e392272797160d9c68dfe51a"
        },
        "date": 1784206996023,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6948,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0213,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.7125,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.9048,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.1717,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.8531,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0369,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2251,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.6763,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.1153,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.0649,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.6598,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.365,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7497,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.8633,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3201,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.1286,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 589.0013,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.5766,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "0534a6380a234839e3fb932d7b14a59d9265de37",
          "message": "refactor(core): split build-candidates and bar/rule/text geometry (#111)\n\nExtract candidate identity index and stat/annotation datum resolver from\nbuildPipelineCandidates; split rects, segments, and glyphs builders out of\nthe bar-rule-text facade. Characterization tests pin source-backed vs\naggregate lineages and text/rule batch kinds.",
          "timestamp": "2026-07-16T08:10:41-05:00",
          "tree_id": "340ea5569c779524999f16d70908262b111dccda",
          "url": "https://github.com/ljodea/ggsvelte/commit/0534a6380a234839e3fb932d7b14a59d9265de37"
        },
        "date": 1784207477002,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6223,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0514,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.2634,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.1337,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.3644,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.8695,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9892,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2057,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.1399,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.9954,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.8336,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.2678,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.4598,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7543,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.76,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.2693,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.938,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 624.4754,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.1669,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "9eb1cab01ed41ca6a494e2aebf382ef46f433bd2",
          "message": "refactor(svelte): carry finish-brush rect/corners in pure action (#112)\n\nExpand resolveFinishBrushAction to take the full brush-end discriminant and\nreturn payload-bearing actions so GGPlot no longer re-narrows ended.kind for\nemit/apply.",
          "timestamp": "2026-07-16T08:14:42-05:00",
          "tree_id": "85a50af115ea106eb8364f33eb11d8dae284279a",
          "url": "https://github.com/ljodea/ggsvelte/commit/9eb1cab01ed41ca6a494e2aebf382ef46f433bd2"
        },
        "date": 1784207714467,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.225,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.3382,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 8.3478,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 10.9209,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 80.1807,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 114.7619,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.8804,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1341,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 83.723,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.9303,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 9.0523,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 10.424,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 94.1827,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.507,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 21.2165,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 4.5335,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 25.96,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 681.6862,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 105.8635,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "77a3353dfdf139cf6aa1dae1c5106ce9ea876b69",
          "message": "refactor(core): split facet wrap/grid and point/path geometry (#113)\n\nExtract facet helpers, wrap partition, and grid partition behind resolveFacet;\nsplit points vs line/area path builders out of geometry-point-path. Tests pin\nempty grid combos, form errors, and closed area batches.",
          "timestamp": "2026-07-16T08:21:16-05:00",
          "tree_id": "d91aff3a474b1b591cf73392835a47e2535f6643",
          "url": "https://github.com/ljodea/ggsvelte/commit/77a3353dfdf139cf6aa1dae1c5106ce9ea876b69"
        },
        "date": 1784208116913,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.2911,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1063,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.8811,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.6572,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.5318,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.4111,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1326,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2846,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.5808,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.3101,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.6431,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.9784,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.1496,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7631,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 25.1541,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4341,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.2967,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 609.8122,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.2891,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a9c391869358f94815967a041a204d402e88855b",
          "message": "fix: avoid hover re-running scene-inspect reconcile after #101 (#114)\n\nCodex P2: planSceneInspectReconcile was passed inspection.state\neagerly, so the host $effect subscribed to transient hover and re-ran\non every pointer update only to hit skip. Use a getInspectionState\nthunk so inspection is only read after the same-run skip gate.",
          "timestamp": "2026-07-16T08:28:52-05:00",
          "tree_id": "f3185e9c72fb3fb021bdc74d27c1d935c90c333d",
          "url": "https://github.com/ljodea/ggsvelte/commit/a9c391869358f94815967a041a204d402e88855b"
        },
        "date": 1784208571130,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 4.1362,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2436,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.1233,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.9396,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 87.7475,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.675,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9798,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2079,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.3216,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.1632,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.6695,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.1448,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 120.3231,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8225,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 30.5278,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.46,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 31.7212,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 633.429,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 168.8508,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d80aab8b49e4ca4a982bd7da118bbcd01aedae93",
          "message": "refactor(svelte): expand inspection and pointerdown action payloads (#115)\n\nCarry emitClear on setInspection clear, source on begin-area, and a single\nflip pin action with target state so the host no longer re-derives those facts.",
          "timestamp": "2026-07-16T08:34:54-05:00",
          "tree_id": "319f73bffe975b1ed293a6fc4ba9eea5e85383fb",
          "url": "https://github.com/ljodea/ggsvelte/commit/d80aab8b49e4ca4a982bd7da118bbcd01aedae93"
        },
        "date": 1784208935168,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8881,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0039,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.3331,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.3506,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 81.6612,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.2826,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0969,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3123,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.6575,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.4334,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.3132,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.7493,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 120.7219,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7597,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 29.4772,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3121,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.8487,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 619.3615,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.1955,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b427ac31e7c19efb041295eedd4e9f0bdb2c22e8",
          "message": "refactor(core): split pipeline types and color scale resolution (#116)\n\nSeparate public contract types from LayerFrame/binding types behind a stable\ntypes barrel. Split sequential vs ordinal color resolution out of\nresolveColorScale. Characterization tests pin sequential inference, explicit\nordinal override, and colorOf unknown fallback.",
          "timestamp": "2026-07-16T08:38:59-05:00",
          "tree_id": "f778bfeec0e96821f0bfb635a9e28a3c124b1846",
          "url": "https://github.com/ljodea/ggsvelte/commit/b427ac31e7c19efb041295eedd4e9f0bdb2c22e8"
        },
        "date": 1784209174296,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 1.9386,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.3309,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 8.0679,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 10.6474,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 63.646,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 93.2304,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.7715,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 0.9495,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 66.4303,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 86.0139,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 10.3823,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 9.5189,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 92.8841,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6387,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 23.2658,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.7702,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 24.1067,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 496.2291,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 132.0749,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3632f836e716f8e431c716b29e71f76cbd17a03a",
          "message": "refactor(core): split bind validation, boxplot body, and finalize phases (#118)\n\nExtract rule-form and geom contracts from bind-layer-validate; split boxplot\nbody vs outliers; and divide finalize into layout/geometry and model assembly.\nCharacterization tests pin boxplot outliers, continuous-x boxplot rejection,\nand identity errorbar channel requirements.",
          "timestamp": "2026-07-16T08:48:03-05:00",
          "tree_id": "42c46b3690fe7142a3866f055db5a9fdec9e858d",
          "url": "https://github.com/ljodea/ggsvelte/commit/3632f836e716f8e431c716b29e71f76cbd17a03a"
        },
        "date": 1784209723244,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6545,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.4477,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.8931,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.941,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 92.5705,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.0696,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.052,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2484,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.8308,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.9951,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.597,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.8707,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.9859,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8029,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.917,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.335,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.8102,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 591.0973,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.8937,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "liam.j.odea@gmail.com",
            "name": "Liam O'Dea",
            "username": "ljodea"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "acdad80ff126acc8090204f1e95cefe175c6a0d8",
          "message": "refactor(svelte): expand pointerup actions with state and source (#117)\n\nCarry inspection state on touch-inspect-tap and interaction source on\nfinish-brush so GGPlot no longer re-derives those from pinEnabled/pointerType.",
          "timestamp": "2026-07-16T08:53:38-05:00",
          "tree_id": "5512483b8eb37928a78f16a097c79d5bdcea1923",
          "url": "https://github.com/ljodea/ggsvelte/commit/acdad80ff126acc8090204f1e95cefe175c6a0d8"
        },
        "date": 1784210057894,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.7856,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1432,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.0703,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.6551,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 87.0566,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 125.9688,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.2033,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.4474,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 94.9577,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.1079,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.4322,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.7918,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 119.7247,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7461,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.7276,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5772,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.5288,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 628.3738,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 163.3885,
            "unit": "ms"
          }
        ]
      }
    ]
  }
}