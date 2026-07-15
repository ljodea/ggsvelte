window.BENCHMARK_DATA = {
  "lastUpdate": 1784122521555,
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
      }
    ]
  }
}