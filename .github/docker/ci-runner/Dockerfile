# CI runner image: the pinned Playwright image + `unzip` baked in.
#
# Why: oven-sh/setup-bun extracts the Bun release zip with the system `unzip`
# binary, which the mcr.microsoft.com/playwright image does not ship. Installing
# it per-job costs an `apt-get update` against Ubuntu mirrors that are throttled
# from GitHub's Azure runners (observed 15m50s / 34 kB/s). Baking it in once
# removes that cost from every container job.
#
# PLAYWRIGHT_TAG MUST stay in sync with env.PLAYWRIGHT_CONTAINER_TAG in
# .github/workflows/ci.yml. Build/publish via .github/workflows/build-ci-image.yml.
ARG PLAYWRIGHT_TAG=v1.61.1-noble
FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_TAG}

# Refresh ONLY `main` from the co-located Azure Ubuntu mirror (a few MB) rather
# than the full 31 MB of indexes across universe/security/backports from the
# throttled public mirrors. Mirrors .github/actions/ci-install-unzip.
RUN set -eux; \
    keyring=/usr/share/keyrings/ubuntu-archive-keyring.gpg; \
    { \
      echo "deb [signed-by=${keyring}] http://azure.archive.ubuntu.com/ubuntu noble main"; \
      echo "deb [signed-by=${keyring}] http://azure.archive.ubuntu.com/ubuntu noble-updates main"; \
    } > /etc/apt/sources.list.d/ci-unzip.list; \
    apt-get \
      -o Dir::Etc::sourcelist=sources.list.d/ci-unzip.list \
      -o Dir::Etc::sourceparts=- \
      -o APT::Get::List-Cleanup=0 \
      update; \
    apt-get install -y --no-install-recommends unzip; \
    rm -rf /var/lib/apt/lists/* /etc/apt/sources.list.d/ci-unzip.list; \
    unzip -v | head -1
