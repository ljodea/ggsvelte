window.BENCHMARK_DATA = {
  "lastUpdate": 1784337678152,
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
          "id": "efa0ec5c777d8aea6511a67bb7acb5e40a6428e2",
          "message": "refactor(core): split candidate datum, layout chrome, and smooth geometry (#119)\n\nExtract frame-row mapping and aggregate lineage filtering from candidate\ndatums; pull labs/formatters/legends into panel-layout chrome; split smooth\nribbon vs fitted line. Tests pin bin lineage closedness, legend margin, and\nsmooth SE ribbon batches.",
          "timestamp": "2026-07-16T08:58:35-05:00",
          "tree_id": "6ab3f604bea94c6ed5ee490c583c51ecfb254525",
          "url": "https://github.com/ljodea/ggsvelte/commit/efa0ec5c777d8aea6511a67bb7acb5e40a6428e2"
        },
        "date": 1784210358888,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 1.9363,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.1439,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 7.467,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 11.1862,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 68.5731,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 98.0084,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.7649,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 0.9654,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 70.6047,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 88.5914,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 8.1388,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 7.7592,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 93.252,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.5718,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 20.8081,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 4.5626,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.6746,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 686.6527,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 105.9831,
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
          "id": "51f22ce2cc925a0583f8b22f4ae5a27615bde560",
          "message": "refactor(svelte): pass pin domain state into capture helpers (#120)\n\nExpand resolveCaptureAriaControls and shouldClosePinnedOnOutsidePointer to\ntake inspectionState (and contentMode) so GGPlot stops pre-deriving pin\nbooleans at call sites, matching isTooltipDocked.",
          "timestamp": "2026-07-16T09:04:50-05:00",
          "tree_id": "9379b359b53483546ab4f539a588567af8cb6779",
          "url": "https://github.com/ljodea/ggsvelte/commit/51f22ce2cc925a0583f8b22f4ae5a27615bde560"
        },
        "date": 1784210728959,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4976,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0228,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.2072,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.6801,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 80.7313,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.1511,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1563,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2244,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 89.6884,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 114.4262,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.605,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.5876,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.2608,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7546,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.7531,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5933,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.131,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 613.1824,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.3113,
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
          "id": "6d76d5dee3b3f7568a4839450b6f6aad62e98b80",
          "message": "refactor(core): split per-stat frame builders and facet grid margins (#121)\n\nExtract count/bin/density and smooth/boxplot/summary into focused frame-stats\nmodules behind stable facades; split facet placement into margin/geometry pass\nand tick placement. Tests pin density singleton-group warnings and free_x axes.",
          "timestamp": "2026-07-16T09:08:53-05:00",
          "tree_id": "e4ec740942e0ce81ae376f0d445e1a900c4efc3b",
          "url": "https://github.com/ljodea/ggsvelte/commit/6d76d5dee3b3f7568a4839450b6f6aad62e98b80"
        },
        "date": 1784210973588,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5853,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9343,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.8653,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.8706,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 80.7994,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.5583,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1785,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3109,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.162,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 105.443,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.767,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.4067,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.0246,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7639,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.8643,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5553,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.6264,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 589.0213,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.945,
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
          "id": "c40490834388a3e01b7c0f4508f59b37542240f0",
          "message": "refactor(svelte): expand emit fingerprint and point-toggle payloads (#122)\n\nOwn clear-vs-semantic fingerprint production in resolveInspectionEmitAction,\ncarry point-toggle keys on the keyboard action, and name the capture-click\npoint nearest radius constant so GGPlot stops re-deriving those policies.",
          "timestamp": "2026-07-16T09:15:49-05:00",
          "tree_id": "11bc26603f1f4317ea8afa976d0d539d3dc631f6",
          "url": "https://github.com/ljodea/ggsvelte/commit/c40490834388a3e01b7c0f4508f59b37542240f0"
        },
        "date": 1784211385365,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6034,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9449,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.9324,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.6968,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.8727,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.3783,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1054,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.272,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.7671,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.5231,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.5938,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.4832,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.2057,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7371,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.2309,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3048,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.5531,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 581.6179,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.7824,
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
          "id": "7cb9018e16a011960b2d418557e05e3b7de6bc8d",
          "message": "refactor(core): split bind contracts, scene assembly, and layout helpers (#123)\n\nExtract geom/stat type contracts, required channels, and color-on-fill\nwarnings from bind-layer-geom-contracts; geometry batches and scene\nbuild from assemble-scene; layout constants/formatters/dedupe from\nlayout-helpers; and backends/fields from layer-contracts. Facades keep\nimport paths stable. Add layout-helpers characterization tests.",
          "timestamp": "2026-07-16T09:21:08-05:00",
          "tree_id": "baca0188f8af2b4ab26d5aede96daaec7dd17507",
          "url": "https://github.com/ljodea/ggsvelte/commit/7cb9018e16a011960b2d418557e05e3b7de6bc8d"
        },
        "date": 1784211705083,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4883,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.7656,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.6702,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 11.9623,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 81.8736,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 116.3202,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9595,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2257,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.772,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.8029,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.9302,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.7402,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.7723,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7538,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.7252,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5174,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.0879,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 614.5067,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 164.8568,
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
          "id": "dd532a18cdd517c20c3afe60beb4c2e985984e7e",
          "message": "refactor(core): split geometry paths, axis training, and panel chrome (#126)\n\nExtract coord-flip and mark-count helpers from geometry.ts; line vs area\npath builders from geometry-paths; axis types/domain from scale-axis-train;\nand labs/display/legends from panel-layout-chrome. Facades keep import\npaths stable. Extend scale-training characterization for continuousDomainOf.",
          "timestamp": "2026-07-16T09:28:13-05:00",
          "tree_id": "cd1be338f566ab4043b96b94f7efe2c4d3b6ea70",
          "url": "https://github.com/ljodea/ggsvelte/commit/dd532a18cdd517c20c3afe60beb4c2e985984e7e"
        },
        "date": 1784212131165,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8004,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.3158,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.1608,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.4313,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.4585,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.7145,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0322,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2449,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 95.677,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.7889,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.4353,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.6049,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 119.2463,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7397,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.9077,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4819,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 33.4141,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 599.2876,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.0084,
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
          "id": "a4e05e72fc52dd0492590a3087dda80ff76b2433",
          "message": "refactor(svelte): carry mapped source on legend commit and preview dismiss (#125)\n\nExpand resolveLegendCommitAction and resolveLegendPreviewDismissAction so\nGGPlot no longer re-maps legendInteractionSource after pure routing. Preview\ndismiss uses previewSource null as the single no-preview discriminant.",
          "timestamp": "2026-07-16T09:34:56-05:00",
          "tree_id": "4bba438ee8ccd13fd0bacd461d8b3afb1e992925",
          "url": "https://github.com/ljodea/ggsvelte/commit/a4e05e72fc52dd0492590a3087dda80ff76b2433"
        },
        "date": 1784212540425,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.0708,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.905,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.3437,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.9664,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.7024,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.1586,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.074,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2507,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.1445,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.5595,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.6827,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.4565,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.7343,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7469,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.4309,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4644,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 32.3712,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 600.7379,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.746,
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
          "id": "8d30b5473687a314a199df3020758c466a0d0dc2",
          "message": "fix: treat SVG-context bare type chains as CSS after #104 (#124)\n\n* fix: treat SVG-context bare type chains as CSS after #104\n\nCodex P2: incomplete SVG allowlist still skipped bare multi-token\nselectors like `svg animateMotion` / `svg mpath` / `svg metadata`.\n\nAccept camelCase SVG-ish idents and any type-ident under SVG container\nroots so alias audit does not miss runtime CSS when `{` is on the next line.\n\n* fix: keep SVG bare-chain matching allowlist-scoped after #124 review\n\nDrop global camelCase and loose SVG-context heuristics that misclassified\nJSDoc (`minValue maxValue`, `svg fallback content`). Keep expanded SVG\nallowlist (animateMotion, mpath, metadata, …) plus custom elements.",
          "timestamp": "2026-07-16T09:40:00-05:00",
          "tree_id": "647d5c2e42f3a36dd86593042fe8f2745a3f62bc",
          "url": "https://github.com/ljodea/ggsvelte/commit/8d30b5473687a314a199df3020758c466a0d0dc2"
        },
        "date": 1784212839208,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.7933,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0086,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.4901,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.9621,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 87.3144,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 125.7333,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1431,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2547,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 93.9396,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.8159,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.863,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.335,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.1073,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.794,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.7017,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3712,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.3361,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 596.6,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.4425,
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
          "id": "32f50b2b2a8298bc25207a83f9b686ed47d3bf71",
          "message": "refactor(core): split public types, scale collect/train, and candidates (#127)\n\nExtract types-public into advisory/model/options modules; scale-axis\nevidence into x/y collectors; pipeline scale training into position vs\ncolor; boxplot body into layout vs batch assembly; and candidate logical\nvalue resolution into a pure helper. Facades keep import paths stable.\nAdd characterization tests for resolveCandidateLogicalValues.",
          "timestamp": "2026-07-16T09:44:53-05:00",
          "tree_id": "e4451272cb8626bb5951dcf4a8a86d49fd7e92a5",
          "url": "https://github.com/ljodea/ggsvelte/commit/32f50b2b2a8298bc25207a83f9b686ed47d3bf71"
        },
        "date": 1784213128734,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4863,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9639,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.0622,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.2957,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.1422,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.097,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9678,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2009,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.8261,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.7787,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.5049,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.1716,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.5324,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7539,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 29.7377,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3173,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.7648,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 618.7972,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.4636,
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
          "id": "bdd572b0e1fad1befadb1046e6b96f10f26c42a9",
          "message": "refactor(svelte): carry pending payload and preview-set source (#128)\n\nExpand restore-pending to include the pending queue payload so GGPlot no\nlonger non-null-asserts pendingPinnedPointer, and expand legend preview-set\nto map entrySource so the last legendInteractionSource call site is pure.",
          "timestamp": "2026-07-16T09:52:22-05:00",
          "tree_id": "c6b30b8f013ac67f6af0b1e4f3fd6eeeaee6176e",
          "url": "https://github.com/ljodea/ggsvelte/commit/bdd572b0e1fad1befadb1046e6b96f10f26c42a9"
        },
        "date": 1784213585071,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3295,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.5609,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.3903,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.1794,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 81.1979,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 116.3733,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.2567,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.182,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 82.4345,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 105.0878,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 9.9099,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 9.7484,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 107.9298,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7093,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 23.6105,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.4303,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.972,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 568.2816,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 129.1705,
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
          "id": "76ccf4d19cd0f79688789cfcbf79b26647d0e16b",
          "message": "refactor(core): split position, facet grid, bind, and finalize helpers (#129)\n\nExtract position jitter/boxplot/bar adjustments; facet outer chrome,\nshared margins, and cell geometry; bindLayer y/extras resolution;\ncandidate datum context helpers; finalize contracts; and preparePanels\nframe building. Facades keep import paths stable. Add characterization\ntests for barSlotKeys and ordinalSeriesRank.",
          "timestamp": "2026-07-16T09:58:00-05:00",
          "tree_id": "df273bbe5587b8fcdb074928feade41247c3033e",
          "url": "https://github.com/ljodea/ggsvelte/commit/76ccf4d19cd0f79688789cfcbf79b26647d0e16b"
        },
        "date": 1784213915371,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5971,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9062,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.4959,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.9182,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.9214,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.2116,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0249,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.282,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.8917,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.4486,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.038,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.5464,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 119.6067,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.806,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.4788,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4385,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.1033,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 593.2457,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.4384,
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
          "id": "779704cccb7b0fb7836b8b69d9d83734584f32c9",
          "message": "refactor(svelte): extract isContainerWidthProp for layout chrome (#130)\n\n* refactor(svelte): extract isContainerWidthProp for layout chrome\n\nCentralize container vs fixed width prop classification used by resolvePlotSize,\npaint readiness, root class, ResizeObserver install, and root inline style.\n\n* test(svelte): avoid undefined literal in isContainerWidthProp coverage",
          "timestamp": "2026-07-16T10:04:55-05:00",
          "tree_id": "702a6f7fe3f16ad2bd6629d735f4564ad4b7e2c1",
          "url": "https://github.com/ljodea/ggsvelte/commit/779704cccb7b0fb7836b8b69d9d83734584f32c9"
        },
        "date": 1784214332293,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5515,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1489,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 13.4662,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.0053,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 80.8769,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 116.691,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9624,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.191,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.3989,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.8172,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.9067,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.1771,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.9645,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8205,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.1479,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3902,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.8269,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 615.6481,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.8274,
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
          "id": "360d4c512eb13e8b4415f4058e3c7128acdf620c",
          "message": "refactor(core): split finalize, geometry builders, and bind helpers (#131)\n\n* refactor(core): split finalize, geometry builders, and bind helpers\n\nExtract layout vs geometry/scene finalize phases; render-model lifecycle;\nboxplot per-row layout; rect slot resolution; errorbar half-width; bind\nfield/color helpers; baseline domain training; and candidate series\nlineage helpers. Facades keep import paths stable. Add characterization\nfor makeErrorbarHalfWidth.\n\n* fix(core): return normalized y bounds from resolveRectSlot once\n\nAvoid double y-scale normalization per bar/histogram row after the\ngeometry-rects split (Codex P2).",
          "timestamp": "2026-07-16T10:09:21-05:00",
          "tree_id": "64192e7b95f8dc3e7acf25a99ceb93a4902a3f87",
          "url": "https://github.com/ljodea/ggsvelte/commit/360d4c512eb13e8b4415f4058e3c7128acdf620c"
        },
        "date": 1784214602799,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 4.1915,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2779,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.7887,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.3014,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 81.1515,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 114.8134,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.2093,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2791,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.0318,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 104.9818,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.0231,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.3374,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 111.1105,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7933,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.1687,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4467,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.6688,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 595.8667,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.0211,
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
          "id": "93a6afd7f7ae02eda58dd9d14753438ad21625ba",
          "message": "refactor(svelte): route keyboard area finish through resolveFinishBrushAction (#132)\n\nDrop the keyboard complete-area finish payload so select/zoom routing has a\nsingle pure owner, share applyFinishBrush with pointer finish-brush, and use\nthe coordFlipped derived instead of re-deriving flip at call sites.",
          "timestamp": "2026-07-16T10:14:13-05:00",
          "tree_id": "18c4e8a2961ca3f1c2d2e3900030fdfdc23f7d8c",
          "url": "https://github.com/ljodea/ggsvelte/commit/93a6afd7f7ae02eda58dd9d14753438ad21625ba"
        },
        "date": 1784214894095,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.0828,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0567,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.8741,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.1798,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.8848,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.001,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1712,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3706,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 83.2763,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 105.4329,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.0758,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.34,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.3409,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7932,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 30.0451,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3573,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.9469,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 596.2998,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.3073,
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
          "id": "07dffa46b1c9834d68a04527d688229277833f7d",
          "message": "refactor(core): split layout formatters, axis train, segments, and types (#133)\n\nExtract layout domain/formatters/ticks; band vs continuous axis training;\nsegment emitters; frame binding/LayerFrame types; geom/stat contracts;\ncandidate auto-mode; scene panel assembly; panel placements; sequential\nlegend format; and candidate field-channel helpers. Facades keep import\npaths stable. Add axisTicks characterization.",
          "timestamp": "2026-07-16T10:19:20-05:00",
          "tree_id": "2a7b99b6e9bd455b09826ec64cfea1d46442676e",
          "url": "https://github.com/ljodea/ggsvelte/commit/07dffa46b1c9834d68a04527d688229277833f7d"
        },
        "date": 1784215201232,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8138,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9802,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.8683,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.21,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.4419,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.9294,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1269,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2345,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.6565,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.3511,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.5859,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.6245,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 117.7698,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7277,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.8906,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5254,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.6411,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 609.9741,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.6346,
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
          "id": "3b56c5cb80db7264d5fc46ae0480102032ce6e50",
          "message": "refactor(svelte): carry begin-area anchor in keyboard decision table (#134)\n\nExpand resolveSurfaceKeyAction begin-area with inspection-vs-panel\nanchor payload so GGPlot no longer re-derives placement policy.\nShare inspect/pin/legendFocus enablement as host $deriveds at call sites.",
          "timestamp": "2026-07-16T10:27:32-05:00",
          "tree_id": "e4461dc8e3cfbca932bf7512bc92e0141fb24376",
          "url": "https://github.com/ljodea/ggsvelte/commit/3b56c5cb80db7264d5fc46ae0480102032ce6e50"
        },
        "date": 1784215698733,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.007,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1234,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.3506,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.1916,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 81.3423,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 115.7942,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0683,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2118,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.5276,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.6152,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.4147,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.1014,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.1524,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7498,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.7933,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5966,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.917,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 595.0094,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.2283,
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
          "id": "5ede50962bf9ec36b23630c5574b94bb061422f2",
          "message": "refactor(core): split closed paths, candidates, boxplot, shared geometry (#135)\n\nExtract shared closed-band edge writing for area/smooth ribbons; identity\ncandidate resolve + source-backed path + represented-row lineage; boxplot\nbody buffer accumulation; geometry position/bucket modules; and frame\ngroup/carried columns. Facades keep import paths stable. Add\nappendClosedBandEdges, layoutBoxplotBody, and series characterization tests.",
          "timestamp": "2026-07-16T10:31:45-05:00",
          "tree_id": "f307c5d7e460c36179ebd6dac19a8308c3cf60ed",
          "url": "https://github.com/ljodea/ggsvelte/commit/5ede50962bf9ec36b23630c5574b94bb061422f2"
        },
        "date": 1784215940477,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8475,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2354,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.9804,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 18.8896,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.8092,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 124.3424,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0497,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1805,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.2485,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.5978,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.2428,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.3756,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.475,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7591,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.1652,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3736,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.1754,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 624.5242,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.2424,
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
          "id": "ad50786908a2f29b91cbfcb11a07b90195c62263",
          "message": "refactor(svelte): carry keyboard complete-area finish payload (#136)\n\n* refactor(svelte): carry keyboard complete-area finish payload\n\nCollapse hasBrushDraft into brushCorners as the sole draft source of\ntruth, move resolveFinishBrushAction to plot-brush-finish, and let the\nkeyboard table own normalize + select/zoom/end routing so GGPlot only\napplies the finish action.\n\n* fix(svelte): flip complete-area null check for no-negated-condition",
          "timestamp": "2026-07-16T10:39:47-05:00",
          "tree_id": "4f86b102d6dc381328c62519d76e44a543ad3925",
          "url": "https://github.com/ljodea/ggsvelte/commit/ad50786908a2f29b91cbfcb11a07b90195c62263"
        },
        "date": 1784216429871,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8833,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2322,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.5898,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.1861,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 86.1236,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.1284,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.3017,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3582,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 89.1011,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 113.0497,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.4313,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.1483,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 123.1882,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7347,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 29.3759,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.7479,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.2649,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 605.1094,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.3417,
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
          "id": "8f0a7256dd508287f09ce872ae3a7f302cd84a70",
          "message": "refactor(core): split candidate resolve, segments, assemble, and finalize (#137)\n\nExtract identity candidate locate/context, identity-indexed store path,\nannotation vs data segment emitters, render-model scale assembly, finalize\ncandidates builder, boxplot body batch parts, sequential domain/range,\nlayer scaled-constants, and errorbar row emission. Facades keep import\npaths stable. Add characterization tests for scale state, sequential\ndomain, source-backed detection, and median fatten.",
          "timestamp": "2026-07-16T10:44:08-05:00",
          "tree_id": "6d3273430ffebb4830943668ced1542efaa8c4c7",
          "url": "https://github.com/ljodea/ggsvelte/commit/8f0a7256dd508287f09ce872ae3a7f302cd84a70"
        },
        "date": 1784216688643,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6299,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.795,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.3315,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.5079,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.4832,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.673,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0427,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2134,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.362,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.7978,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.5302,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.3129,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.3078,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7953,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.8231,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.326,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.4503,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 588.4061,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 163.4133,
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
          "id": "fe98521cc176d608d328d2b1ce470884ac44270e",
          "message": "refactor(svelte): carry pointer finish-brush finish payload (#138)\n\nCollapse pointer-up hasBrushDraft into brushCorners, compose free-corner\nevaluation in plot-brush-finish, and let finish-brush carry the complete\nFinishBrushAction so GGPlot only cancels scheduled pointer and applies.",
          "timestamp": "2026-07-16T10:49:51-05:00",
          "tree_id": "30a1051bc86eb00bbd7c86f333094fd18c3c5203",
          "url": "https://github.com/ljodea/ggsvelte/commit/fe98521cc176d608d328d2b1ce470884ac44270e"
        },
        "date": 1784217027413,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8914,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8919,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.1623,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.1738,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 86.8336,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.776,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0172,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2371,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.8208,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.2416,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.6774,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.6335,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 119.6041,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 1.1388,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.8245,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4906,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.8441,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 597.6899,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.1844,
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
          "id": "d8f253cdb6b55f8fe86ad3038b1dc967bbeb2b09",
          "message": "refactor(core): split candidate assemble, color collect, geometry, frames (#139)\n\nExtract identity candidate assemble after locate; panel chrome types;\ncolor channel collect and ordinal range; glyph/point/line geometry helpers;\nannotation and identity frame builders; finalize assemble packing; facet\ntokens; and scene legend placement. Facades keep import paths stable.\nAdd characterization tests for point collection, legend placement, color\ncollect, and facet value tokens.",
          "timestamp": "2026-07-16T10:58:44-05:00",
          "tree_id": "c71950bd03d8ebd9cc3f51560d2f4dc77fc7e0e4",
          "url": "https://github.com/ljodea/ggsvelte/commit/d8f253cdb6b55f8fe86ad3038b1dc967bbeb2b09"
        },
        "date": 1784217567676,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.2202,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9908,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.509,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.4158,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.3761,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.5774,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0343,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2179,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.0286,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.7301,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.3659,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.7314,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.9304,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7705,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.045,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4372,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.35,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 597.0944,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.5347,
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
          "id": "a1a25a35ab9fede283e5c2ee63277fd898f2eadf",
          "message": "refactor(core): split candidate attrs, facet cells, closed paths, rects (#141)\n\nExtract identity candidate attrs; boxplot layout types/finalize; facet\npanel size and col/row placement; chrome display flip helpers; shared\nclosed-path multi-group writer for area/smooth; rect emission; geometry\npanel frames; prepare-panels types; render-model domains; sequential\nresult packing. Facades keep import paths stable. Add characterization\ntests for flip helpers, facet panel size, and panel frames.",
          "timestamp": "2026-07-16T11:06:16-05:00",
          "tree_id": "652c87374d06c0e9f1e8934a29bdc192c5552bba",
          "url": "https://github.com/ljodea/ggsvelte/commit/a1a25a35ab9fede283e5c2ee63277fd898f2eadf"
        },
        "date": 1784218016254,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6443,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.835,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.6872,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.7128,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.5356,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.2849,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0248,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1988,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.781,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.957,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.7216,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 14.0324,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 120.4297,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 1.0018,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 29.2158,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4238,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 33.08,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 587.4504,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.9734,
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
          "id": "147b40f551e48b533a47ee4d8dc8876d68ea3e3b",
          "message": "refactor(svelte): carry pointer begin-area corners payload (#140)\n\nReplace pointer-down hasBrushDraft/extendExisting with brushCorners + pure\nowned initialBrushRect corners so extend-vs-fresh policy cannot diverge\nfrom host existing draft. Host only assigns action.corners and emits.",
          "timestamp": "2026-07-16T11:12:21-05:00",
          "tree_id": "430c7e49a4c7768e9ec0a267705027b7207006dc",
          "url": "https://github.com/ljodea/ggsvelte/commit/147b40f551e48b533a47ee4d8dc8876d68ea3e3b"
        },
        "date": 1784218390824,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6759,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.043,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.3633,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.5052,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 79.335,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.4667,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0228,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1945,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.0395,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 114.1339,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.8685,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.3803,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.6643,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8098,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.6289,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4959,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.9549,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 586.7716,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.6772,
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
          "id": "21400eb04be4601dee3416d8379916c3a392d5bd",
          "message": "refactor(core): split candidate attrs, facet place, ordinal, contracts (#142)\n\nExtract identity series/mode and lineage/annotation helpers; assemble\nrender-model input type; chrome display types; trained scale types;\nper-facet panel placement; single-panel margin reserve; finalize layer\nvs domain contracts; ordinal train/result packing; bin frame packing;\nbind-layer result assembly; lazy identity index. Facades keep import\npaths stable. Add characterization tests for margin reserve and lazy index.",
          "timestamp": "2026-07-16T11:18:23-05:00",
          "tree_id": "cbe1fca71b9dd9ace28265033f326518255121ef",
          "url": "https://github.com/ljodea/ggsvelte/commit/21400eb04be4601dee3416d8379916c3a392d5bd"
        },
        "date": 1784218738664,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.9121,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.5594,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.0072,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.1783,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.6745,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.3386,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9809,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1904,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.5417,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.167,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.782,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.5137,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.7847,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8213,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 29.5439,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3158,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.5093,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 625.71,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.6938,
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
          "id": "95db5cbf93bd3783be5ee57dc352899f41401228",
          "message": "refactor(svelte): carry keyboard nudge-brush corners payload (#143)\n\nExpand resolveSurfaceKeyAction nudge-brush to pure-owned clamped corners\n(preferring inspectionPanel over firstPanel). Draft without a panel\nswallows arrows via preventDefault + none; host only assigns corners\nand dispatches the free-corner point.",
          "timestamp": "2026-07-16T11:24:31-05:00",
          "tree_id": "6eb1313c460e29ad1a1a6756eb6405ddd5a0455a",
          "url": "https://github.com/ljodea/ggsvelte/commit/95db5cbf93bd3783be5ee57dc352899f41401228"
        },
        "date": 1784219105686,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6045,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0966,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.5582,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.7382,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 80.886,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.9408,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0495,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2209,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.917,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.6928,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.5381,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.7895,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.5841,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8106,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.501,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.327,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.7565,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 624.8708,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.9881,
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
          "id": "0eab5ca3681ae4c269e78b961bc90f68a19f8ae0",
          "message": "refactor(core): split pipeline entry, facet place, scene, boxplot batches (#144)\n\nExtract public API re-exports and run-id allocation; facet grid input and\nmap/place helpers; scene/finalize input types; boxplot rects vs segments;\ncandidate locate types and outlier/annotation/ordinal-rank modules; setup\nnormalize/edition/theme; prepare-panels bin ranges and empty-layer warns;\nsmooth frame packing; single-panel placement packing; panel layout result\npack. Facades keep import paths stable. Add characterization tests for\nrun ids and outlier context.",
          "timestamp": "2026-07-16T11:30:21-05:00",
          "tree_id": "367ec130044c2a7dfed0eec47b9f20a63f5dcd6b",
          "url": "https://github.com/ljodea/ggsvelte/commit/0eab5ca3681ae4c269e78b961bc90f68a19f8ae0"
        },
        "date": 1784219464540,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5692,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0014,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.7872,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.6041,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 87.8964,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.3814,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0616,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2019,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.7369,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.8453,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.4841,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.3335,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 111.2252,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7584,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.7691,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3311,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.2662,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 597.6159,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.7575,
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
          "id": "9e23aa24dd23033ffbb6a5f0ed887a5f425cf6ae",
          "message": "refactor(svelte): own brush-zoom M2 gate in resolveBrushZoomFromModel (#145)\n\nMove single-panel/null-model brush-to-zoom policy next to domain invert\nand freeze commit-ready domains in pure code so GGPlot only commits.",
          "timestamp": "2026-07-16T11:35:58-05:00",
          "tree_id": "fd7aa3c638433f252fbb9351c69e822bf55a0d6b",
          "url": "https://github.com/ljodea/ggsvelte/commit/9e23aa24dd23033ffbb6a5f0ed887a5f425cf6ae"
        },
        "date": 1784219793232,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8781,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2598,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.2635,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.8022,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 81.4222,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 116.6684,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.3506,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3703,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.8578,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.3693,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.8988,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.5869,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.8743,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7994,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.8785,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.2693,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 32.9522,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 596.2979,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.9005,
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
          "id": "4138a38cc4dad0ddf625a97287bafb485b610600",
          "message": "refactor(core): extract runPipeline body, layout packs, segments, bind (#146)\n\nMove orchestration into run-pipeline and split layout/bind/scale/geometry\nhelpers behind stable facades so pipeline modules stay PR-sized and easy\nto maintain. Add characterization tests for segment packing and facet\npanel placement.",
          "timestamp": "2026-07-16T11:43:16-05:00",
          "tree_id": "b7fafc93a7051224e8c89959884deee0b4c90c62",
          "url": "https://github.com/ljodea/ggsvelte/commit/4138a38cc4dad0ddf625a97287bafb485b610600"
        },
        "date": 1784220235337,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5441,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8742,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.375,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.4482,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 80.3523,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.4123,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0601,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.5207,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 90.7333,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 105.9656,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.5802,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.3533,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.4693,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8029,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.0766,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4844,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.7112,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 589.0591,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.8214,
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
          "id": "0a77ff09146fc1df96d941a104292649bd21d2ad",
          "message": "refactor(svelte): pass inspect domain config on pointer move and up (#147)\n\n* refactor(svelte): pass inspect domain config on pointer move and up\n\nReplace inspectEnabled/pinEnabled booleans with the resolved inspect\ndomain object so queue-inspect and touch-inspect-tap carry mode,\nmaxDistance, and pin state — host no longer re-gates config or re-reads\nnearest params after pure routing.\n\n* fix(svelte): keep SurfaceInspectConfig private for knip",
          "timestamp": "2026-07-16T11:50:57-05:00",
          "tree_id": "eec44d9337e8e10466a72d38b46c7f351335252a",
          "url": "https://github.com/ljodea/ggsvelte/commit/0a77ff09146fc1df96d941a104292649bd21d2ad"
        },
        "date": 1784220695871,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.9795,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 5.9129,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 12.5066,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.5793,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.2007,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.5074,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1204,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2525,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.9458,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.4231,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.3366,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.6679,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.6796,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 1.1406,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.2678,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3748,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 35.144,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 596.0879,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.4856,
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
          "id": "966b7687c85ea690a2439dc5bb6a2d2b57e3f140",
          "message": "refactor(core): split free scales, facet form, smooth/area lineage helpers (#148)\n\nExtract free-panel scale training, continuous zero/warnings, facet form\nflags, smooth-line vertex write, area fill resolution, and lineage row\nfilters behind stable facades. Add characterization tests for the new\npure seams.",
          "timestamp": "2026-07-16T11:57:24-05:00",
          "tree_id": "bce2e79b891b6b230ff1e50fefc41359ad13981c",
          "url": "https://github.com/ljodea/ggsvelte/commit/966b7687c85ea690a2439dc5bb6a2d2b57e3f140"
        },
        "date": 1784221079928,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5597,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8569,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.8417,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.3887,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.1682,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.5741,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0058,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2044,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.678,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.4957,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.4463,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.055,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 112.6624,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8141,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.2583,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.2616,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 33.6129,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 607.6805,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 167.0975,
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
          "id": "6bc8be01a9d39563a5850306f8e8cb5e9408085b",
          "message": "refactor(svelte): split plot-surface-inspection by host call path (#149)\n\nCarve the 549-line pure inspection policy module into frame (queue/frame\nrouting), apply (setInspection/pin/mode), and teardown (blur/reconcile/emit/\ndismiss) files. Update GGPlot and unit tests to import each path directly;\ndelete the monolithic module (no barrel). Behavior-preserving; tests green.",
          "timestamp": "2026-07-16T12:07:10-05:00",
          "tree_id": "8c171c6231e264c9830a2e32d5d2f9ec55b52456",
          "url": "https://github.com/ljodea/ggsvelte/commit/6bc8be01a9d39563a5850306f8e8cb5e9408085b"
        },
        "date": 1784221665527,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.4185,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0845,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 15.854,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.4959,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 89.3989,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 116.4979,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.2738,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3162,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.1405,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.9396,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.9827,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.2399,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 110.6419,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8001,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.0747,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.2763,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.4325,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 592.353,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.6614,
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
          "id": "6855e50548c907b498222238b687d8d164058460",
          "message": "ci: route Linux workflows to self-hosted ggsvelte runners (#150)\n\n* ci: route Linux workflows to self-hosted ggsvelte runners\n\nPoint Linux jobs at the repo-scoped self-hosted pool labeled ggsvelte so\nCI no longer burns GitHub-hosted minutes. Windows/macOS matrix rows and\nhosted-only manual AT stay on GitHub runners. Teach actionlint about the\ncustom label (config for the Go CLI; wasm filter in scripts/actionlint.ts).\n\n* ci: keep privileged/OIDC jobs on GitHub-hosted runners\n\nAddress Codex review: leave release (npm OIDC), pages deploy, vr-approve,\nand bench-trend write paths on ubuntu-latest so the self-hosted pool only\nruns read-scoped CI. Move actionlint config to .github/actionlint.yaml for\nGo CLI auto-discovery.",
          "timestamp": "2026-07-16T13:43:28-05:00",
          "tree_id": "422d3df500a9e2de51b01b0a64ac646d3d0f84bc",
          "url": "https://github.com/ljodea/ggsvelte/commit/6855e50548c907b498222238b687d8d164058460"
        },
        "date": 1784227445918,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3895,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.6848,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.3112,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.0473,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 90.2977,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.5283,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9811,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.1998,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.983,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 117.3527,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.9974,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.6604,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.5695,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8214,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 25.8119,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.2489,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 35.2495,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 608.5682,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.6073,
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
          "id": "b90e90cc684b7c38c5cb0faa6eaf14e09b76b3e7",
          "message": "fix(test): give the SSR hydration gate a contention-tolerant timeout (#151)\n\nThe /__ggplot-ssr fetch transforms the entire GGPlot SSR module graph on\nthe suite-shared Vite server; under full-suite transform contention\n(three browsers, 150+ files, slower self-hosted runners) it can wait\nwell past 30s, which is the only observed failure mode of this test.\nEager warm-up at server start is unsafe — it races dep re-optimization\nand yields mixed Svelte server runtimes (lifecycle_outside_component) —\nso keep the endpoint lazy and lift the ceiling to 120s.\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-16T14:43:24-05:00",
          "tree_id": "dc86dce991eaa12bc645995ca9e1e6242ab65c0e",
          "url": "https://github.com/ljodea/ggsvelte/commit/b90e90cc684b7c38c5cb0faa6eaf14e09b76b3e7"
        },
        "date": 1784231044387,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5542,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9381,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.8833,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.0785,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.2867,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.0106,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0507,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.4765,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 89.0749,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.1669,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.7756,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.292,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.7841,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8163,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.2217,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4896,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 31.8392,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 607.0297,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 163.4357,
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
          "id": "d1e363bc008fce858ad811ff9c10b9067267ce17",
          "message": "fix(ci): run the /approve-visuals gate on a GitHub-hosted runner (#152)\n\nThe approve-gate job resolves the PR head via `gh api`, but #150 routed\nit to the self-hosted ggsvelte runners, which do not ship the GitHub\nCLI — every real /approve-visuals command now fails with exit 127\n(\"gh: command not found\"). The job is a 5-second read-only API lookup\nthat runs no checked-out code, so pin it back to ubuntu-latest where gh\nis preinstalled, matching vr-approve.yml.\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-16T14:55:37-05:00",
          "tree_id": "6ec5ef1249498197c10ff618fc8f381f14f0b828",
          "url": "https://github.com/ljodea/ggsvelte/commit/d1e363bc008fce858ad811ff9c10b9067267ce17"
        },
        "date": 1784231772884,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.2739,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.6419,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 12.0121,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.6623,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 95.532,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.3362,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.5396,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.6228,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.6697,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.9337,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.5423,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.7785,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 119.5908,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.815,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.1997,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.2487,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 31.4398,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 623.7669,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 163.7088,
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
          "id": "70b107032c57354cae8eef93144ab8234e5d4c89",
          "message": "feat: add R3 filtering and facet interval semantics (#79)\n\n* test: define typed legend filter semantics\n\n* feat(svelte): add accessible precise bounds editor\n\n* feat(core): add canonical facet panel identity\n\n* feat(interaction): add semantic facet interval state\n\n* feat(core): filter rows before the grammar pipeline\n\n* feat(interaction): invert brushes within facet panels\n\n* feat(interaction): enable interval selection in facets\n\n* feat(interaction): adapt precise bounds to plot scales\n\n* feat(svelte): add explicit legend filtering\n\n* fix(interaction): preserve precise bounds tuple type\n\n* fix(core): preserve true empty-data fallback under filters\n\n* docs: demonstrate filtering and faceted intervals\n\n* feat: integrate facet intervals and precise bounds\n\n* feat(interaction): consume semantic facet intervals\n\n* fix(examples): inherit dark-theme interaction text\n\n* fix(interaction): consume semantic facet intervals\n\n* feat(interaction): start precise bounds without brushing\n\n* test(interaction): update R3 recovery contracts\n\n* test(perf): gate R3 interaction commit costs\n\n* fix(interaction): preserve typed band bounds\n\n* fix(interaction): reconcile legend filter state\n\n* fix(interaction): preserve typed brush domains\n\n* test(interaction): isolate legend reconciliation\n\n* fix(interaction): clarify accessible facet controls\n\n* fix(interaction): close R3 review gaps\n\n* chore: satisfy R3 release gates\n\n* chore: keep R3 internals private\n\n* fix: address Codex P2 review findings on R3 surfaces\n\n- read candidate values and aggregate lineages through the unfiltered source table so runtime row filters cannot corrupt inspection values\n- honor explicit layer aes null (null-unset) in active legend-filter bindings instead of re-inheriting the plot-level field\n- key legend filter checkboxes by encoded raw value, not display label\n- prune interval record keys in controller reconcileKeys so linked consumers stop publishing invalidated keys\n- honor reversed band scales when inverting brush bounds to categories\n- keep legends fed by scaled constants non-filterable\n- clear the committed brush rectangle when a controller clears or moves this chart's interval record\n- position band-axis ticks through typed rawDomain instead of labels\n- reject ISO date-times whose calendar date does not round-trip\n- render the interaction live region for legend-filter-only plots\n- scroll overflowing tool-rail recovery actions instead of overlapping the mode tabs (caught by the brush-zoom VR gate)\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* fix(vr): update interval clear label expectation; widen R3 filter p95 budget for CI\n\nThe R3 branch renamed the interval clear controls to 'Clear panel\nselection'/'Clear all selections' without updating the responsive VR\nspec (VR only runs in the pinned container). The legend-filter commit\np95 budget (250ms, introduced by this branch) has no headroom on CI\nrunners (observed 250.2ms and 289.6ms vs ~120ms locally); widen to\n320ms.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* fix: address second-round Codex P2 findings\n\n- key bar/boxplot position slots by encodeKey so typed band categories with colliding labels (1 vs \"1\") stack and dodge in their own bands\n- stack the legend filter fieldset below the Clear-focus button when both are active, reserving both rows\n- raise the open precise-bounds editor above transparent legend hit targets (z-index 6 > 5)\n- return null from boundsEditorInputForScale when a stored band endpoint is missing from the current catalog instead of silently substituting the first category (host already cancels + announces)\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* fix: address third-round Codex review findings\n\n- Index independent interval keys with a Set before scanning candidates (P1)\n- Invalidate the committed brush rectangle when a same-panel record is\n  replaced externally (sameIntervalRecord content comparison)\n- Project applied precise bounds back into panel pixels via\n  intervalPixelsFromDomains instead of reusing stale/full-panel rects\n- Clear legend filter clauses whose legend stopped being filterable\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* fix: address fourth-round Codex P2 findings\n\n- Fall back to layer bindings for legend titles when filters empty the data\n- Dedupe legend entries by typed identity; qualify colliding labels\n- Accept sub-millisecond fractions and colonless ISO offsets in bounds editor\n- Skip interval commits when no semantic axis survives (empty facet panel)\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* fix: address fifth-round Codex P2 findings\n\n- Skip the O(candidates) semantic projection for empty and union interval\n  records (controller revision no longer rescans candidates needlessly)\n- Honor select.persistent in precise bounds: no durable record or\n  committed rectangle when nonpersistent, end event still fires\n- Warn (INTERACTION_INTERVAL_PRESET_REQUIRES_KEY) when union/cross-panel\n  presets run keyless and would silently combine no rows\n- Qualify colliding typed category labels in the bounds editor selects,\n  sharing the legend disambiguation helper\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-16T15:03:34-05:00",
          "tree_id": "6bf1449d56c6f31f9125b5a43e9a53469e741f01",
          "url": "https://github.com/ljodea/ggsvelte/commit/70b107032c57354cae8eef93144ab8234e5d4c89"
        },
        "date": 1784232249549,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 4.1446,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.1283,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 12.0893,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.4214,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.0686,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.9042,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0478,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2833,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.4587,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.2678,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.2702,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.677,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.1424,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7837,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.3142,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4002,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.3468,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 605.5828,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 165.0776,
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
          "id": "159e7cd8194ba6bfcb268de9d257f63c095b8d1d",
          "message": "fix: gate workflow linting on pre-push when .github/ changes (#156)\n\nactionlint and zizmor only ran in CI's actions-security job, so workflow\nedits got no local feedback. Wire both into the pre-push stage (files\nfilter on ^\\.github/), skip gracefully when the wasm binding or zizmor\nbinary is missing, and derive self-hosted label suppressions from\n.github/actionlint.yaml so the Go CLI config and wasm runner cannot drift.\n\nCloses #155",
          "timestamp": "2026-07-16T15:22:15-05:00",
          "tree_id": "0b1de08eb9ce6b6bf9b999abe46d838b674779ba",
          "url": "https://github.com/ljodea/ggsvelte/commit/159e7cd8194ba6bfcb268de9d257f63c095b8d1d"
        },
        "date": 1784233376541,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4482,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9528,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.1476,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.3876,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 93.6028,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.3691,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0553,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2646,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.2027,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.1656,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.1682,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.4659,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 112.5861,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.794,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.9208,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4469,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.1775,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 601.3793,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.0153,
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
          "id": "c93d2028b0b4a9626fd367786d912e124d65fbb0",
          "message": "fix: keep actionlint load failures fatal in CI (#157)\n\n* fix: keep actionlint load failures fatal in CI\n\nCodex review on #156:\n- P1: soft-skip on wasm load/init only outside CI so actions-security\n  cannot green when actionlint never ran\n- P2: parse YAML list scalars (inline comments + quotes) so label\n  suppressions match the Go CLI config\n\n* fix: decode YAML double-quoted escapes in label parser\n\nCodex P2 on #157: stripping backslashes turned \\u002d into u002d\ninstead of '-', so suppressions would not match Go actionlint labels.",
          "timestamp": "2026-07-16T15:42:13-05:00",
          "tree_id": "0ff85285807a99bb9bb66bc1ef193fffbd08e573",
          "url": "https://github.com/ljodea/ggsvelte/commit/c93d2028b0b4a9626fd367786d912e124d65fbb0"
        },
        "date": 1784234575761,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.6779,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2556,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.6985,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.1168,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 95.3212,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 123.2088,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1524,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3988,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.8083,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.9656,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.9094,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 14.3839,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 121.5646,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7631,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 29.7942,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.714,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.2427,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 611.1251,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 163.3565,
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
          "id": "11b9698bec0b3e13403cf7a3b7d5865baab0f524",
          "message": "fix(ci): stop interaction-perf wall-clock flakes from blocking merges (#158)\n\nAbsolute p50/p95 budgets on the shared self-hosted host (4 runners /\n8 vCPU) intermittently failed the required component check — R3 filter\n\"p95\" with n=8 was effectively the max sample (issue #154).\n\n- Move test:interaction-perf into a separate non-required job\n- Add R3 filter warmup and n=20 so p95 is a real percentile\n- Allow one Playwright retry under CI for residual host noise\n- Hard gate remains on run-bench PRs via bench.yml",
          "timestamp": "2026-07-16T15:55:36-05:00",
          "tree_id": "574f523bcfc34eb3591cd6d065885ad54cde2a67",
          "url": "https://github.com/ljodea/ggsvelte/commit/11b9698bec0b3e13403cf7a3b7d5865baab0f524"
        },
        "date": 1784235370668,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5692,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.4179,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 7.2981,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 9.4118,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 65.2036,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 93.826,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0211,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.0531,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 71.1772,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 85.2287,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 10.9889,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 9.8709,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 89.5563,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6251,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 20.6874,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.8102,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 24.7445,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 488.7041,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 130.6475,
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
          "id": "f4eeefe76d2c46c382d60e726a6290e2c728ae0b",
          "message": "fix(svelte): deterministic forced-colors paint for disabled-at-SSR tool buttons (#161)\n\n* fix(svelte): deterministic forced-colors paint for disabled-at-SSR tool buttons\n\nThe vr forced-colors screenshot (interaction-zoom-draft-forced-colors) was\nmachine-dependent: idle tool-rail buttons painted either GrayText or\nButtonText depending on scheduling. Two defects combined:\n\n1. ToolRail rendered its buttons disabled during SSR (ready is false until\n   hydration's client flush) and Chromium does not repaint a control's\n   FORCED text/border color when `disabled` is removed unless the computed\n   author value changes with the state. Whichever paint happened first\n   (disabled GrayText vs enabled ButtonText) stuck for the rest of the\n   page's life. Fix: an explicit `:disabled { color: GrayText;\n   border-bottom-color: GrayText }` rule inside the existing\n   forced-colors media block, so the computed values genuinely change on\n   the disabled->enabled flip and invalidation fires. This also gives\n   genuinely disabled tools (empty plot) a correct high-contrast\n   disabled affordance.\n\n2. ToolRail and PlotStatusChrome consumed --gg-theme-interactionMuted in a\n   color position, but that theme token is a NUMERIC alpha (theme.ts\n   interactionMuted: 0.36) - `color: 0.36` is invalid at computed-value\n   time and silently fell back to the inherited color. The color chains now\n   use only the consumer-facing --gg-interactionMuted override with a\n   currentColor fallback (pixel-identical to the shipped rendering).\n\nVerified: 8 consecutive local --update-snapshots runs of the forced-colors\ntest produce zero GrayText pixels, and a full update->compare cycle of the\n82-shot vr suite passes byte-identically. Note: this PR's own vr-compare\nstill fails against the stale pre-R3 committed baselines (#153); baselines\nregenerate via /approve-visuals once this lands.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* test(svelte): lock forced-colors disabled paint contracts for #161\n\nGuard the ToolRail GrayText :disabled rules and the no-numeric-alpha\ncolor chain in ToolRail/PlotStatusChrome so the Chromium repaint fix\ncannot regress silently.\n\n---------\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-16T19:22:42-05:00",
          "tree_id": "257d4487006c46281f1656ba31dfb7ecd2464779",
          "url": "https://github.com/ljodea/ggsvelte/commit/f4eeefe76d2c46c382d60e726a6290e2c728ae0b"
        },
        "date": 1784247802112,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.564,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0404,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.0473,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.9557,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 90.9144,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.7764,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.3695,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3449,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.3741,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.3482,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.6063,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.9354,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.0879,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7902,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 25.6567,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5685,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.1897,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 601.4191,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.5586,
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
          "id": "93c192fa0eaa12a6e4d7c313f4050caca9677661",
          "message": "vr: update baselines for PR #168 @ ea483808a01533e10480ff77b2b48be5dbdb0839 (#169)\n\nCo-authored-by: ggsvelte-vr-bot <vr-bot@users.noreply.github.com>",
          "timestamp": "2026-07-16T22:49:14-05:00",
          "tree_id": "41237027746ede241453506fe430e739cf98afcf",
          "url": "https://github.com/ljodea/ggsvelte/commit/93c192fa0eaa12a6e4d7c313f4050caca9677661"
        },
        "date": 1784260195853,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4014,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0424,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.57,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.9492,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 90.1896,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 123.1595,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.3153,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.4128,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 89.2137,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.0239,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.2527,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 14.2658,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.2406,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7975,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.9079,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.358,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.9108,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 595.1176,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.863,
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
          "id": "75a30b29abf714296a28406947762af9eff64b93",
          "message": "fix(svelte): preserve legend filter contrast (#168)",
          "timestamp": "2026-07-16T23:00:08-05:00",
          "tree_id": "fa145e6a090cdb3261adc69ab65b2a3718ab2453",
          "url": "https://github.com/ljodea/ggsvelte/commit/75a30b29abf714296a28406947762af9eff64b93"
        },
        "date": 1784260845605,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8356,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1175,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.1563,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.0399,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 87.1158,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.4956,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0613,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3143,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 93.4729,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.125,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.7908,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.4188,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.5115,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8072,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 29.4843,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4831,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.1682,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 629.5221,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 169.4617,
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
          "id": "e5f4d027cdccf633182550f14a0b3de4c27e8798",
          "message": "Merge pull request #159 from ljodea/ggr/s1-runtime\n\nrefactor(svelte): S1 — extract plot runtime + shared services, add LOC ratchet",
          "timestamp": "2026-07-16T23:11:07-05:00",
          "tree_id": "7a5b7f63ff14bd4ea98081de0ad6aeda70eb9598",
          "url": "https://github.com/ljodea/ggsvelte/commit/e5f4d027cdccf633182550f14a0b3de4c27e8798"
        },
        "date": 1784261501621,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3152,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.2249,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.3556,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.4586,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.9051,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 116.7566,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0931,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.268,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 83.9709,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 111.8786,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.8806,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 14.4223,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.646,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8154,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.6505,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4983,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.3409,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 593.5984,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.7199,
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
          "id": "fb8796820793fac30cd3ffb2b86681d9097cf4c6",
          "message": "Merge pull request #162 from ljodea/ggr/s2-legend-filter\n\nrefactor(svelte): S2 — extract legend-filter controller + PlotLegendFilters",
          "timestamp": "2026-07-16T23:18:49-05:00",
          "tree_id": "d81dedcb5b7e365cf3f9cc6886ec1f87ab3e5d82",
          "url": "https://github.com/ljodea/ggsvelte/commit/fb8796820793fac30cd3ffb2b86681d9097cf4c6"
        },
        "date": 1784261973955,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3811,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9003,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.0285,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.6469,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.5541,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.7031,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.223,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.268,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.3733,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 105.2297,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.8911,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.9079,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.3226,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7927,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.9292,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4449,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.7592,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 598.3042,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.2948,
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
          "id": "2a4af99aa53b2ae61af55dc448fe74a2319ff3b3",
          "message": "Merge pull request #163 from ljodea/ggr/s3-legend-focus\n\nrefactor(svelte): S3 — extract legend-focus controller",
          "timestamp": "2026-07-16T23:26:35-05:00",
          "tree_id": "4be4b20e0fb4b49ccb5a1aa3d212eabfae916401",
          "url": "https://github.com/ljodea/ggsvelte/commit/2a4af99aa53b2ae61af55dc448fe74a2319ff3b3"
        },
        "date": 1784262428503,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.5891,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.1444,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.2138,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.3025,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 81.9283,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 115.3645,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1033,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2796,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 83.5534,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 103.3229,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.9428,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.255,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 110.1412,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7965,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.2015,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5235,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.8852,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 598.2381,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 158.5834,
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
          "id": "03dbd12e7eb4f153c74e942b665c9d4a4e4df237",
          "message": "Merge pull request #164 from ljodea/ggr/s4-zoom\n\nrefactor(svelte): S4 — extract zoom controller",
          "timestamp": "2026-07-16T23:36:04-05:00",
          "tree_id": "277fb10c2d89d18862d1d9a95fadeca005c243a5",
          "url": "https://github.com/ljodea/ggsvelte/commit/03dbd12e7eb4f153c74e942b665c9d4a4e4df237"
        },
        "date": 1784263002963,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3907,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.062,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.3401,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.3949,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 81.4143,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 114.9902,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1121,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2606,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.9935,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 104.221,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.2682,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.1912,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.4494,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 1.4684,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.8115,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3208,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.4417,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 603.1698,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.4563,
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
          "id": "dd9e5a071127372cfd0d95fb5613539ac4746246",
          "message": "Merge pull request #166 from ljodea/ggr/s5-interval\n\nrefactor(svelte): S5 — extract interval-selection + bounds-editor controller",
          "timestamp": "2026-07-16T23:44:51-05:00",
          "tree_id": "57b7ecf22cc11628268a848038b1c4e4b89487f1",
          "url": "https://github.com/ljodea/ggsvelte/commit/dd9e5a071127372cfd0d95fb5613539ac4746246"
        },
        "date": 1784263532307,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.4366,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.1865,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 14.1073,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.9371,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.7903,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 118.2042,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.3452,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3609,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.4687,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 108.0122,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.5538,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 14.3847,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 111.6086,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.788,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 25.9103,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.6493,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.0894,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 610.3179,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.0634,
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
          "id": "4cad21bf568b0ae5bc476ca6bac5ac2db3f9e06c",
          "message": "Merge pull request #167 from ljodea/ggr/s6-inspection\n\nrefactor(svelte): S6 — extract inspection controller",
          "timestamp": "2026-07-17T00:04:09-05:00",
          "tree_id": "32f05ba076ae439e8d0cbae4c15b51297ebfada9",
          "url": "https://github.com/ljodea/ggsvelte/commit/4cad21bf568b0ae5bc476ca6bac5ac2db3f9e06c"
        },
        "date": 1784264683540,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.2756,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.7324,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.3541,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.9888,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 80.4317,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.2832,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.6027,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.4055,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 90.5844,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 104.7553,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.4423,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.4412,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.0646,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.792,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.3357,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3598,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 33.5934,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 593.4721,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.6268,
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
          "id": "0c1104abcb4c2b894453d7828c8b86501347ef1e",
          "message": "Merge pull request #170 from ljodea/ggr/s7-surface\n\nrefactor(svelte): S7 — extract surface controller",
          "timestamp": "2026-07-17T00:13:51-05:00",
          "tree_id": "be0d4475ace90594cf25bc8755a7883dbd602019",
          "url": "https://github.com/ljodea/ggsvelte/commit/0c1104abcb4c2b894453d7828c8b86501347ef1e"
        },
        "date": 1784265266581,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 1.9242,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.508,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 8.3461,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 10.4958,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 70.454,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 103.2522,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.8594,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.0893,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 74.9596,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 88.6941,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 9.9786,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 10.0711,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 93.3768,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.632,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 20.9594,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.715,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 25.3333,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 500.61,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 131.8282,
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
          "id": "df8841acffb1168b218e01fcb9ccd51c8e072259",
          "message": "Merge pull request #171 from ljodea/ggr/s8-selection-chrome\n\nrefactor(svelte): S8 — extract selection + chrome controllers (final slice, GGPlot < 1000)",
          "timestamp": "2026-07-17T00:23:17-05:00",
          "tree_id": "158191e05857e865f3c3bc22be9e350f00b61a51",
          "url": "https://github.com/ljodea/ggsvelte/commit/df8841acffb1168b218e01fcb9ccd51c8e072259"
        },
        "date": 1784265831896,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.8628,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.8434,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.4616,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.4165,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.2863,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 123.0132,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0743,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2759,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.1288,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 104.8431,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.2338,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.3827,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 111.5612,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7925,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.261,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.342,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.8408,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 605.9506,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.283,
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
          "id": "98df82be621bb0debbe3a09ea9063b89fe3dff18",
          "message": "chore(svelte): S9 — raise Svelte peer floor to 5.33.1 (#172)\n\n* chore(svelte): raise Svelte floor data to 5.33.1\n\n* chore(svelte): rewrite obsolete 5.29 eager-SSR comments\n\n* chore: changeset for Svelte floor bump\n\n* chore(svelte): make floor-bump comments and compat default fully truthful\n\nReview findings on the S9 comment rewrites: at the 5.33.1 lazy-derived\nfloor, an unreached construction-time \\$derived is no longer a crash\nhazard on any platform, so comments claiming the .ssr suites or\ncompat:consumer \"gate\" that case were stale, and the interval-state\nhazard note described a construction-time TDZ mechanism the floor bump\nremoved. Reworded to the live contract: armed-getter suites enforce\nconstruction-read discipline; only direct construction-time reads TDZ.\n\nAlso single-source the consumer-compat Svelte default from\nsupport-matrix.json (the floor now lives in one place) and replace the\nretired 5.29.0 pass-through fixture literal with 0.0.0-fixture.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* chore: refresh workspace lock metadata\n\n---------\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-17T12:50:59-05:00",
          "tree_id": "1214fd6ddc56406937058809f32e309c68772e53",
          "url": "https://github.com/ljodea/ggsvelte/commit/98df82be621bb0debbe3a09ea9063b89fe3dff18"
        },
        "date": 1784310698906,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.872,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0785,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.9194,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.891,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 102.0171,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 143.1099,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.2226,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.6362,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 103.2175,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 125.3678,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.0105,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.7327,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 125.9666,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8322,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.5632,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 6.3081,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 40.0469,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 651.488,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 150.5452,
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
          "id": "38d03d693131e60e77bbccaab5a907f1c1aa9498",
          "message": "refactor(svelte): S10 — dissolve alias scaffolding in GGPlot (#173)\n\n* chore(svelte): raise Svelte floor data to 5.33.1\n\n* chore(svelte): rewrite obsolete 5.29 eager-SSR comments\n\n* chore: changeset for Svelte floor bump\n\n* chore(svelte): make floor-bump comments and compat default fully truthful\n\nReview findings on the S9 comment rewrites: at the 5.33.1 lazy-derived\nfloor, an unreached construction-time \\$derived is no longer a crash\nhazard on any platform, so comments claiming the .ssr suites or\ncompat:consumer \"gate\" that case were stale, and the interval-state\nhazard note described a construction-time TDZ mechanism the floor bump\nremoved. Reworded to the live contract: armed-getter suites enforce\nconstruction-read discipline; only direct construction-time reads TDZ.\n\nAlso single-source the consumer-compat Svelte default from\nsupport-matrix.json (the floor now lives in one place) and replace the\nretired 5.29.0 pass-through fixture literal with 0.0.0-fixture.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* refactor(svelte): inline controller reads, delete alias deriveds\n\n* refactor(svelte): delete extraction-era stage markers and stale scaffolding comments\n\n* test(svelte): append S10 ratchet ceiling\n\n* refactor(svelte): correct model-effects registration-order comment\n\nReview finding: the rewritten comment inverted the load-bearing order —\nlegend-reset effects register during legendFilterState construction,\nbefore registerModelEffects(), not after it.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-17T13:08:21-05:00",
          "tree_id": "e64a0344cb4f05944584f8a6f8ca026b09e8d0bc",
          "url": "https://github.com/ljodea/ggsvelte/commit/38d03d693131e60e77bbccaab5a907f1c1aa9498"
        },
        "date": 1784311741756,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3711,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.875,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.3377,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.5666,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 100.087,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.018,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0853,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2657,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.9399,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.7079,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.5876,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.8586,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 110.3225,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7891,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 24.6445,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3852,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 29.6851,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 591.9731,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.9728,
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
          "id": "36b77058056f1c6d80d5f4b33dbbb6512090b271",
          "message": "refactor(svelte): S11 — extract plot orchestrator (#174)\n\n* refactor(svelte): move Props interface to plot-props.ts\n\n* refactor(svelte): extract createPlotOrchestrator\n\n* test(svelte): append S11 ratchet ceiling\n\n* refactor(svelte): tighten orchestrator boundary after review\n\nReview + type-aware lint findings on the extraction: delete the vestigial\nfactory* no-op casts (the PublicKey→PropertyKey widening lives at the\nGGPlot call site; handler contravariance covers the narrower per-event\ndep types), drop the dead semanticKeys member from the public\nPlotOrchestrator surface, use the destructured stable refs in\nresetScales/setZoom, import RenderModel at top level, and satisfy\nunbound-method/void-expression rules with braced arrow wrappers\n(plot-orchestrator.svelte.ts is the first wiring code covered by\ntype-aware lint — GGPlot.svelte was exempt as a .svelte file).\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* test(svelte): pin orchestrator lifecycle order\n\n---------\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-17T14:32:02-05:00",
          "tree_id": "0998aec83c7e82ece6213b4a4f8a80aa0b6fc469",
          "url": "https://github.com/ljodea/ggsvelte/commit/36b77058056f1c6d80d5f4b33dbbb6512090b271"
        },
        "date": 1784316757257,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.4385,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.4169,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.7687,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.9122,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.5324,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 117.5384,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0258,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2737,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 83.9471,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 105.3755,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.2426,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.2723,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 115.1427,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8097,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.3283,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4043,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.6138,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 623.0998,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 168.3027,
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
          "id": "2fcac08e7ce59b74e4131298d0b5512ff71f23e7",
          "message": "refactor(svelte): S12 — coverage tooling; geoms/, assembly/, chrome/, a11y/ directories (#176)\n\n* test(svelte): add v8 coverage tooling (non-gating)\n\n* refactor(svelte): move geoms/, assembly/, chrome/, a11y/ into feature directories\n\n* test(svelte): direct coverage for registry, factory, and geom declarations\n\n* test(svelte): scope geom mark assertions to mark layers; de-dup coverage base\n\nReview findings: the geom smoke test's fallback selectors (', rect',\n', line', bare 'text') matched always-rendered chrome (panel rects,\ngridlines, axis labels), so an empty mark layer could not fail the\n'no silent empty plot' assertion for 7 of 12 geoms — selectors are now\nscoped to the mark-batch classes only (.gg-points/.gg-rects/.gg-segments/\n.gg-areas/.gg-paths/.gg-glyphs). Also: LayerRegistry construction needs\nno effect root (class-field $state), trackLayerCount reuses the\nwithEffectRoot helper, and the browser/SSR coverage blocks share one\ncoverageBase so the two reports can never drift to different file sets.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* test(svelte): harden coverage and relocation checks\n\n---------\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-17T15:13:14-05:00",
          "tree_id": "82e62c6f3bb6077713ba43933b50472ce2704459",
          "url": "https://github.com/ljodea/ggsvelte/commit/2fcac08e7ce59b74e4131298d0b5512ff71f23e7"
        },
        "date": 1784319230571,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 1.8298,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.5517,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.3746,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 11.5694,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 69.4082,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 92.8214,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.9919,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.0193,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 67.1051,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 86.0504,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 10.668,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 10.6262,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 89.4814,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6262,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 20.4033,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.8051,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 20.5976,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 489.7496,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 126.2412,
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
          "id": "9178d0c0d8af0cd7ef7335ce50cbc100ea4a71fa",
          "message": "refactor(svelte): S13 — runtime/, scene/ directories; split shared services (#177)\n\n* refactor(svelte): move runtime/ and scene/ into feature directories\n\n* refactor(svelte): split plot-shared-services into announcer and semantic-keys\n\n* test(svelte): scene coverage per report\n\n* test(svelte): table-drive axis orient cases; single point-model builder\n\nReview findings: the y-axis test duplicated the x-axis body (40 lines,\nonly orient/transform/anchor varying) — now one it.each over an orient\ntable; the three near-identical buildModel closures in the semantic-keys\nsuite collapse into one buildPointModel helper.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* fix(svelte): correct SceneView font URLs for scene/ directory depth\n\nS13 moved SceneView.svelte into scene/ without updating the @font-face\nurl(\"./fonts/...\") references, which now resolved to a nonexistent\nscene/fonts/. Point them at ../fonts/.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* test(svelte): remove stale runtime test boilerplate\n\n---------\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-17T16:21:52-05:00",
          "tree_id": "939b05e51c84eeaebd514a082c90f386acb8e811",
          "url": "https://github.com/ljodea/ggsvelte/commit/9178d0c0d8af0cd7ef7335ce50cbc100ea4a71fa"
        },
        "date": 1784323347292,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3821,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9596,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.4987,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.9494,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 91.44,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.3994,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.2901,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3837,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.3225,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 109.2897,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.5124,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.7546,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.7415,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7924,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.8923,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5807,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 37.4969,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 606.9218,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.0516,
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
          "id": "52a6ee7db7a8f27bc3fbbddf545a9f1b3ec8d23a",
          "message": "refactor(svelte): S14 — interaction/, surface/, selection/, zoom/ directories (#178)\n\n* refactor(svelte): move interaction/, surface/, selection/, zoom/ into feature directories\n\n* refactor(svelte): finish CaptureSurface rename; disambiguate plot-px module\n\nReview findings: the mirrored capture-surface test still bound the\ncomponent as PlotCaptureSurface (8 stale references); and surface/ held\nboth pointer.ts and plot-pointer.ts after prefix-dropping erased the old\nplot-surface-pointer vs plot-pointer distinction — the coordinate-helper\nmodule is now plot-px.ts, matching what its name always meant.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* docs(svelte): refresh moved-module references\n\n---------\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-17T16:35:19-05:00",
          "tree_id": "30c827d05d833689448cd3c4a76c6e0e97af16d6",
          "url": "https://github.com/ljodea/ggsvelte/commit/52a6ee7db7a8f27bc3fbbddf545a9f1b3ec8d23a"
        },
        "date": 1784324160998,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.5119,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.128,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 9.5306,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.4961,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 98.5724,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 133.933,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1206,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3933,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 98.6051,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 121.0281,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.863,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.1443,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 124.077,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7773,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 25.0653,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 6.1297,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 36.1381,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 658.0045,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 148.4099,
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
          "id": "9e712df98c9def35e3ef909442e55e1eb51f6a10",
          "message": "refactor(svelte): move inspection/ and interval/ into feature directories (#179)\n\nRename-only slice: place inspection and interval modules under\nfeature directories without merging frame/apply/teardown or\ninterval/consumption. Update all relative import specifiers and\nmirror the test tree. Tooltip remains a public export via a deepened\npath; BoundsEditor and bounds-editor keep their basenames.",
          "timestamp": "2026-07-17T16:58:40-05:00",
          "tree_id": "f2860116b35479c752464c90d7c521723bb3164c",
          "url": "https://github.com/ljodea/ggsvelte/commit/9e712df98c9def35e3ef909442e55e1eb51f6a10"
        },
        "date": 1784325560925,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3689,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.1821,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.0306,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.678,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 83.6704,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 115.9258,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1034,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.273,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.653,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.2235,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.0704,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.5064,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.0592,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7866,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.5763,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4469,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.1405,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 606.6776,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.7352,
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
          "id": "32cf20e1607e5dfda7bc131faa7c85e46513cc29",
          "message": "refactor(svelte): S16 — legend/ directory; entry-key-index ownership (#180)\n\n* refactor(svelte): move legend/ into a feature directory\n\nCo-locate legend focus, filter, surface, and component modules under\nlegend/ with short feature-local names. Rewrite importers and mirror\ntests under tests/legend/. Public legend-filter export names unchanged.\n\n* test(svelte): red-first spec for legend entry-key-index service\n\nPins the createLegendEntryKeyIndex factory contract before the module\nexists: discrete-legend index Map, keysForLegend resolution, reactive\nre-resolve on model change (S13 access contract), and empty/null model.\n\n* refactor(svelte): move legend entry-key index out of semantic-keys\n\nLift the reactive entry→key index into legend/entry-key-index.svelte.ts,\nwire it from the orchestrator after semanticKeys, and rename focus-state\ndeps to entryKeys. runtime/semantic-keys no longer imports legend modules.\n\n* test(svelte): harden entry-key-index spec; restore keyAt data-token coverage\n\nReview findings: the new spec's keyAt stub mutated in lockstep with the\nmodel swap, so the keyAt reactive channel was never exercised — keyAt now\nlives in a reactive box with a keyAt-ONLY re-resolution assertion (model\nheld constant). The migration had also dropped the real-service\nkeyAt-after-full-data-replacement assertions — restored as a dedicated\nsemantic-keys test. Point-model builder deduplicated into\ntests/helpers/point-model.ts; stale RED-phase comments removed;\ntests/legend/legend-targets.test.ts → targets.test.ts for naming\nconsistency.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n\n* test(svelte): refresh legend test references\n\n---------\n\nCo-authored-by: Claude Fable 5 <noreply@anthropic.com>",
          "timestamp": "2026-07-17T17:09:15-05:00",
          "tree_id": "7bc94df3e6d2d8c3f25e79768add120918cfa5d5",
          "url": "https://github.com/ljodea/ggsvelte/commit/32cf20e1607e5dfda7bc131faa7c85e46513cc29"
        },
        "date": 1784326191298,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3789,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.3733,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.5461,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 17.6421,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 85.6427,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 116.3114,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0295,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2306,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 84.9318,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.9251,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.4922,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.2929,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 109.7249,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8202,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.2325,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.401,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 28.5792,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 628.2205,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 170.3093,
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
          "id": "4d9cf3c06e39aac4d09a543f25a084f68397610c",
          "message": "test(svelte): S17 — coverage thresholds, gap closure, directory docs (#181)\n\n* test(svelte): close the remaining browser branch gaps\n\nReport-driven gap closure for Legend, Batch, CanvasA11y, inspection\nresolver, and surface-state: behavioral cases for empty legend titles,\nmark shapes/focusable a11y, resolver fingerprints/fallbacks, and surface\nignore/none action paths.\n\n* test(svelte): enforce coverage thresholds (browser config)\n\nAdd statements/branches/functions/lines thresholds (90/80/90/90) to the\nbrowser vitest coverage block only, after the coverageBase spread, so\nthe SSR report stays threshold-free.\n\n* docs: document the svelte package layout and coverage workflow\n\nMap packages/svelte/src/lib feature directories and root files, the no\nper-directory barrels rule, tests-mirror-src layout, and the browser\ncoverage thresholds workflow (local/optional, not CI yet).\n\n* test(svelte): strengthen inspection reconciliation coverage",
          "timestamp": "2026-07-17T17:28:15-05:00",
          "tree_id": "ca7ff8106c656c0fc908c5b888e1a03691bc5208",
          "url": "https://github.com/ljodea/ggsvelte/commit/4d9cf3c06e39aac4d09a543f25a084f68397610c"
        },
        "date": 1784327330119,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.2748,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.9666,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.4341,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 16.1686,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.7404,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 120.1355,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.2523,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2617,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 83.7167,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 105.5503,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 12.9422,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.1934,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.7094,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8061,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.0874,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.5329,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 26.322,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 625.1416,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 165.7395,
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
          "id": "059f6defa47512ba4ee7cd1be31b8923c5125294",
          "message": "fix(svelte): O(n) selection key membership via Set (#182)\n\n* fix(svelte): use Set membership for selection key helpers\n\nuniqueKeysFromRowIndexes and nextPointSelectionKeys used array includes\nfor dedup/membership, which is O(n²) on large brushes and multi-select.\nSwitch to Set lookups (O(n) / O(n+m)) while preserving first-seen order\nand existing toggle algebra. Add scale-ratio regression tests.\n\n* test(svelte): replace wall-clock complexity guards with deterministic large-input checks\n\nThe two ratio<35 timing guards on nextPointSelectionKeys and\nuniqueKeysFromRowIndexes flaked on webkit under CI contention (observed\nratios 40/53/90/210 vs a <35 bound) — the noise floor of dividing two\nsub-ms performance.now() samples on a saturated runner exceeds any bound\nthat still distinguishes O(n) from O(n²). The O(n) guarantee is structural\n(Set membership) and perf-regression coverage belongs to the bench-smoke\njob, not a gating browser unit assertion. Behavioral coverage at scale is\nretained via deterministic large-input dedup/deselect checks.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Opus 4.8 <noreply@anthropic.com>",
          "timestamp": "2026-07-17T17:52:12-05:00",
          "tree_id": "1ead7637a587a43679b92e208f53f45bedeaef2d",
          "url": "https://github.com/ljodea/ggsvelte/commit/059f6defa47512ba4ee7cd1be31b8923c5125294"
        },
        "date": 1784328766821,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 1.7658,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.2209,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 8.0577,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 10.7557,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 65.4218,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 94.3124,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 0.8519,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 0.9809,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 68.9714,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 87.5717,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 10.7294,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 10.5174,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 89.1734,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.6301,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 22.5174,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.6953,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 24.9501,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 496.5307,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 129.6665,
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
          "id": "86aa6a5b2d91a8c65ed3892577ed5697a971129c",
          "message": "perf(core): partition facet panels in one O(n) pass (#188)\n\n* perf(core): partition facet panels in one O(n) pass\n\nFacet wrap/grid previously re-scanned the full table once per panel\n(or twice per grid cell) via rowsMatching. Partition by encodeKey once\nper field, then assemble panels from buckets — O(n+v) wrap and\nO(n + R·C intersection) grid, with ggplot2 empty-combo parity preserved.\n\nCloses #183\n\n* fix(core): drop unused rowsMatching; fix unbound-method in facet tests\n\nRemove the dead per-value scan helper after partitionByField adoption\n(knip). Count column reads via the property descriptor so oxlint\nunbound-method stays clean on the complexity spies.\n\n* test(core): cover rows-only and cols-only facet grid partition\n\nLocks single-dimension grid paths that now read pre-partitioned buckets\ninstead of re-scanning via rowsMatching.\n\n* perf(core): partition facet grid by composite key in one O(n) pass\n\nAddress review of #188:\n\n- Grid: replace per-cell bucket intersection (O(n·(R+C))) with a single\n  composite (row, col) partition — partitionByFields, O(n) + O(R·C) reads.\n  Hoist the row-dimension lookup out of the inner column loop.\n- Drop unreachable `?? []` fallbacks in wrap and grid single-dimension\n  paths: every panel value comes from facetValues() over the same column,\n  so its bucket always exists — assert loudly instead of masking the\n  contract. The full-grid `?? []` remains, now genuine empty combinations.\n- Cover partitionByFields (composite buckets, number/string key parity,\n  one read per column).\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Opus 4.8 <noreply@anthropic.com>",
          "timestamp": "2026-07-17T18:22:34-05:00",
          "tree_id": "130f515eda513db9f9fe1bffe72093d0935af12c",
          "url": "https://github.com/ljodea/ggsvelte/commit/86aa6a5b2d91a8c65ed3892577ed5697a971129c"
        },
        "date": 1784330596134,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.4901,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.8721,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.0838,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 12.001,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.3267,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 115.6788,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.3172,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3566,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.751,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 105.7772,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.2026,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.2339,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.5983,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7943,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.8037,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3539,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 31.9601,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 606.1969,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 160.4333,
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
          "id": "c9b2f89e8450d489e2eb933080b70e468aaffee1",
          "message": "perf(core): O(1) aggregate candidate lineage via group×x/bin indexes (#189)\n\n* perf(core): O(1) aggregate candidate lineage via group×x/bin indexes\n\nPre-bucket represented source rows by (panel, layer, group, xKey) and by\nbin frame row when building the identity index, so count/summary/boxplot/bin\nmark resolve no longer re-filters the full group per output mark (O(k·g) →\nO(n) build + O(1) lookup). Preserve lineage parity, including singleton\nboxplot outlier memberships.\n\nFixes #184\n\n* fix(core): satisfy prefer-nullish-coalescing on lineage index lookup\n\n* fix(core): freeze aggregate lineage bucket arrays after index build\n\n* fix(core): O(n log k) bin lineage assign; gate group×x to aggregate stats\n\nAddress Codex P1/P2 on #189: assign each source row to a bin once via\nbinary search on ordered edges instead of re-scanning the group per bin,\nand only build sourceRowsByGroupX for count/summary/boxplot consumers.",
          "timestamp": "2026-07-17T18:33:39-05:00",
          "tree_id": "085dcb6c62ca1cf596aa41364e0602a66a056e1f",
          "url": "https://github.com/ljodea/ggsvelte/commit/c9b2f89e8450d489e2eb933080b70e468aaffee1"
        },
        "date": 1784331260406,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.3412,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.7088,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.8241,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.9587,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 88.0804,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 119.9769,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1518,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.295,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.562,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.9487,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 15.5475,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.6038,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.5863,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8018,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.439,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.2809,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.4913,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 615.2038,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.189,
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
          "id": "b4c36110d1e8c9405f49e701ce4537ca1f51f25f",
          "message": "perf(core): precompute path group sorted rows for candidate resolve (#193)\n\n* perf(core): precompute path group sorted rows for candidate resolve\n\nresolveCandidateFrameRow rebuilt and sorted every group's frame rows on\neach path-vertex lookup (O(G·n log n) during identity-indexed store\nbuild). Build Map<groupId, sortedRows> once per LayerFrame (WeakMap\ncache) and look up derivedGroup — O(n log n + G).\n\nFrame-row / reflected local mapping for lines, areas, and smooth paths\nis unchanged. Closes #186.\n\n* test(core): avoid Map.groupBy for type-aware oxlint\n\nRewrite series bucketing in the path-group candidate test with a plain\nMap loop so oxlint --type-aware stays clean under deny-warnings.",
          "timestamp": "2026-07-17T18:59:30-05:00",
          "tree_id": "e2c3f350e35e79aeeb5f01c0ac24439596c2a631",
          "url": "https://github.com/ljodea/ggsvelte/commit/b4c36110d1e8c9405f49e701ce4537ca1f51f25f"
        },
        "date": 1784332808397,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.378,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.0388,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 13.0767,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 14.0654,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 90.7812,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 122.8841,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0263,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2548,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 88.5054,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 114.1252,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.8803,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 11.5264,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 118.3479,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8166,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.7599,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.3593,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 30.3809,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 627.0677,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 169.1975,
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
          "id": "68aa494f60a38038ff95a487494fe41701c72fc4",
          "message": "perf(core): O(1) rank lookup for candidate-store next/previous traverse (#194)\n\nFixes #187. Build a dense inverse rank of the sequential traversal once\nat store construction so keyboard next/previous navigation is O(1)\ninstead of O(n) indexOf per step. Spatial directions are unchanged.",
          "timestamp": "2026-07-17T19:28:11-05:00",
          "tree_id": "698f5b757fa1f3dbc65db705f304e3089f5f9b43",
          "url": "https://github.com/ljodea/ggsvelte/commit/68aa494f60a38038ff95a487494fe41701c72fc4"
        },
        "date": 1784334528866,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.2177,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 2.7313,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.0073,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 13.4957,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 84.2,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 125.7461,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0656,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2328,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.0631,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.5038,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 11.3477,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 10.9606,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 113.5062,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.8079,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 28.0401,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.4169,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.283,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 616.834,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 166.8509,
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
          "id": "e8456cc70663923c1e2fc3ab08e5832a9cc3d903",
          "message": "perf(core): index drawStratum batches by panel in one O(B) pass (#192)\n\n* perf(core): index drawStratum batches by panel in one O(B) pass\n\ndrawStratum re-filtered the full batch list once per panel (O(P·B)), and\nthe focus path also map+filtered per panel. Group batches (and original\nindices for focus masks) once, then walk panels — O(B+P) with paint order\nand mask index alignment preserved.\n\nCloses #185\n\n* fix(core): reject non-integer panelIndex in groupBatchesByPanel\n\nNaN and fractional panelIndex bypassed the range guard (comparisons are\nfalse), then byPanel[p]!.push threw. Match the old filter path: skip\nmalformed indices so a bad batch cannot abort the stratum draw.\n\nAddresses Codex P2 on #192.",
          "timestamp": "2026-07-17T19:36:40-05:00",
          "tree_id": "b760de447b7fd96f54356c1176d5243652d7523e",
          "url": "https://github.com/ljodea/ggsvelte/commit/e8456cc70663923c1e2fc3ab08e5832a9cc3d903"
        },
        "date": 1784335040813,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.9452,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.4354,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 12.9667,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.9408,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 82.5225,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 116.2993,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.0865,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2913,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 85.7458,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 106.2674,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.6176,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.7,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 114.6933,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7658,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 27.6654,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.407,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.3362,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 606.6958,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 161.274,
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
          "id": "4b24689d1298c3c18209c9e5f5bb046f78170963",
          "message": "perf(spec): short-circuit isPortable on first issue (#190)\n\n* perf(spec): short-circuit isPortable on first issue\n\nisPortable only needs a boolean, but it previously ran a full\nportabilityIssues walk over the entire tree (including large inline\ndata). Walk now accepts an optional stopAfter so the type guard exits\nafter the first issue; portabilityIssues and toPortable still collect\nevery path.\n\n* fix(spec): lazy key iteration for isPortable early exit\n\nObject.entries eagerly evaluates every property (including getters)\nbefore the loop, so stopAfter could not skip later sibling getters.\nIterate Object.keys and read values one at a time; strengthen the\nearly-exit test to put a bomb getter on the same object.\n\n* fix(spec): lazy for-in walk for portability early exit\n\nUse for…in + Object.hasOwn so key enumeration is lazy (no full\nObject.keys array before stopAfter can break) and properties deleted\nby earlier getters are skipped, matching Object.entries/JSON omit\nsemantics. Regression test covers the delete-mid-walk case.\n\n* docs(spec): clarify isPortable stopAfter only defers value Gets\n\nEngines still list own keys before for…in yields; the early-exit win\nis skipping later property Gets and recursive walks, not OwnPropertyKeys.",
          "timestamp": "2026-07-17T19:40:03-05:00",
          "tree_id": "6094395fd70c1dc46ce34138ddb7a27f2da684b0",
          "url": "https://github.com/ljodea/ggsvelte/commit/4b24689d1298c3c18209c9e5f5bb046f78170963"
        },
        "date": 1784335242955,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.0532,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.4758,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.4064,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.021,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 88.7732,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.7253,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.3235,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3941,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 87.5439,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 110.2215,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 14.5729,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 13.0361,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 121.3346,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7913,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 32.0254,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.9231,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.6548,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 619.4621,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 162.7315,
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
          "id": "28b608898a764c345bbfdac966794ebe12a42a1a",
          "message": "perf(spec): share field evidence between dataChecks and lint (#191)\n\nvalidate({ lint: true }) previously pivoted inline data and ran\ninferProfileType twice — once in dataChecks and again in lintSpec.\nResolve field evidence once and pass the map to both paths so large\nrow-shaped specs pay O(cells) once per validate call.",
          "timestamp": "2026-07-17T20:20:18-05:00",
          "tree_id": "833ae08fcbb03922a8e924c8f836b53709a17083",
          "url": "https://github.com/ljodea/ggsvelte/commit/28b608898a764c345bbfdac966794ebe12a42a1a"
        },
        "date": 1784337657602,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 3.5542,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 4.0238,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 10.433,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.2472,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 101.7781,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 121.7014,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.1899,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.2761,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 86.8258,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 107.643,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 13.54,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 12.1823,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 116.2893,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7934,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.9492,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 7.2697,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 27.293,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 598.6529,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 159.7219,
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
          "id": "6f453998794967952cf5453a345b16a91c1dcc07",
          "message": "perf(svelte): O(R) inspection sourceKeys dedup via uniqueKeysFromRowIndexes (#206)\n\nReplace Array#includes membership in PlotDatum source-key collection with\nthe shared Set-based first-seen helper (O(R) instead of O(R²) for large\naggregate/stat lineages). Preserve first-seen order and null-skipping;\nadd behavioral + structural scale tests.\n\nCloses #200",
          "timestamp": "2026-07-17T20:20:34-05:00",
          "tree_id": "fe7bd4568ae5789f41d1c6d921c49c8baeea1f4a",
          "url": "https://github.com/ljodea/ggsvelte/commit/6f453998794967952cf5453a345b16a91c1dcc07"
        },
        "date": 1784337676731,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "pipeline scatter 1k",
            "value": 2.7839,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 1k",
            "value": 3.1589,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 10k",
            "value": 11.5631,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 10k",
            "value": 15.7536,
            "unit": "ms"
          },
          {
            "name": "pipeline scatter 100k",
            "value": 98.5855,
            "unit": "ms"
          },
          {
            "name": "svg render scatter 100k",
            "value": 125.5637,
            "unit": "ms"
          },
          {
            "name": "pipeline stacked-bars 50x4",
            "value": 1.2558,
            "unit": "ms"
          },
          {
            "name": "svg render stacked-bars 50x4",
            "value": 1.3518,
            "unit": "ms"
          },
          {
            "name": "pipeline line-series 10x10k",
            "value": 96.9287,
            "unit": "ms"
          },
          {
            "name": "svg render line-series 10x10k",
            "value": 117.167,
            "unit": "ms"
          },
          {
            "name": "pipeline faceted-bars 50 panels",
            "value": 10.6626,
            "unit": "ms"
          },
          {
            "name": "svg render faceted-bars 50 panels",
            "value": 10.3964,
            "unit": "ms"
          },
          {
            "name": "canvas cold scatter 100k",
            "value": 122.1611,
            "unit": "ms"
          },
          {
            "name": "canvas redraw scatter 100k",
            "value": 0.7835,
            "unit": "ms"
          },
          {
            "name": "hit-index build 100k",
            "value": 26.5909,
            "unit": "ms"
          },
          {
            "name": "candidate lookup 100k",
            "value": 5.9087,
            "unit": "ms"
          },
          {
            "name": "pipeline histogram 100k",
            "value": 32.3016,
            "unit": "ms"
          },
          {
            "name": "pipeline loess 5k",
            "value": 621.1435,
            "unit": "ms"
          },
          {
            "name": "pipeline density 100k",
            "value": 140.2469,
            "unit": "ms"
          }
        ]
      }
    ]
  }
}