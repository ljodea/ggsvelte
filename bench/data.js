window.BENCHMARK_DATA = {
  "lastUpdate": 1783996450914,
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
      }
    ]
  }
}